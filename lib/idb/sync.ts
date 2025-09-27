'use client'

import { db, IDBTask, IDBProject, IDBPomodoroSession, ISyncQueueEntry } from './schema'
import { idbClient } from './client'

// 同期状態の管理
export interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  lastSyncTime: number | null
  pendingChanges: number
  errors: string[]
}

// 競合解決の戦略
export type ConflictResolution = 'local' | 'remote' | 'manual'

// 同期マネージャークラス
export class SyncManager {
  private isOnline = navigator.onLine
  private isSyncing = false
  private syncInterval: NodeJS.Timeout | null = null
  private listeners: ((status: SyncStatus) => void)[] = []
  private userId: string | null = null

  constructor() {
    this.setupOnlineListeners()
  }

  setUserId(userId: string): void {
    this.userId = userId
    idbClient.setUserId(userId)
  }

  private ensureUserId(): string {
    if (!this.userId) {
      throw new Error('User ID is not set')
    }
    return this.userId
  }

  // オンライン状態の監視
  private setupOnlineListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true
      this.notifyListeners()
      this.triggerSync()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      this.notifyListeners()
      this.stopAutoSync()
    })

    // Page Visibility API で同期トリガー
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.triggerSync()
      }
    })
  }

  // 状態リスナーの管理
  addListener(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  private async notifyListeners(): Promise<void> {
    const status = await this.getStatus()
    this.listeners.forEach(listener => listener(status))
  }

  // 同期状態の取得
  async getStatus(): Promise<SyncStatus> {
    const pendingChanges = await this.getPendingChangesCount()
    const lastSyncTime = this.getLastSyncTime()

    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncTime,
      pendingChanges,
      errors: [], // 実際にはエラーログから取得
    }
  }

  private getPendingChangesCount(): Promise<number> {
    return db.syncQueue.count()
  }

  private getLastSyncTime(): number | null {
    const lastSync = localStorage.getItem('lastSyncTime')
    return lastSync ? parseInt(lastSync) : null
  }

  private setLastSyncTime(time: number): void {
    localStorage.setItem('lastSyncTime', time.toString())
  }

  // 自動同期の開始/停止
  startAutoSync(intervalMinutes = 5): void {
    this.stopAutoSync()

    if (!this.isOnline) return

    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.triggerSync()
      }
    }, intervalMinutes * 60 * 1000)
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  // 同期のトリガー
  async triggerSync(): Promise<boolean> {
    if (!this.isOnline || this.isSyncing) {
      return false
    }

    this.isSyncing = true
    this.notifyListeners()

    try {
      await this.performSync()
      this.setLastSyncTime(Date.now())
      return true
    } catch (error) {
      console.error('Sync failed:', error)
      return false
    } finally {
      this.isSyncing = false
      this.notifyListeners()
    }
  }

  // 実際の同期処理
  private async performSync(): Promise<void> {
    const userId = this.ensureUserId()

    // 1. ローカルの変更をサーバーに送信
    await this.pushLocalChanges()

    // 2. サーバーから変更を取得
    await this.pullServerChanges()

    // 3. 競合を解決
    await this.resolveConflicts()

    // 4. 完了したキューエントリを削除
    await this.cleanupCompletedEntries()
  }

  // ローカル変更をサーバーに送信
  private async pushLocalChanges(): Promise<void> {
    const userId = this.ensureUserId()
    const queueEntries = await idbClient.getSyncQueue()

    for (const entry of queueEntries) {
      try {
        await this.processQueueEntry(entry)
        await idbClient.removeSyncQueueEntry(entry.id!)
      } catch (error) {
        console.error(`Failed to sync entry ${entry.id}:`, error)
        await idbClient.incrementSyncRetry(entry.id!, error instanceof Error ? error.message : 'Unknown error')

        // 10回以上失敗した場合はスキップ
        if (entry.retryCount >= 10) {
          await idbClient.removeSyncQueueEntry(entry.id!)
        }
      }
    }
  }

  // サーバーから変更を取得
  private async pullServerChanges(): Promise<void> {
    const userId = this.ensureUserId()
    const lastSyncTime = this.getLastSyncTime()

    if (!lastSyncTime) {
      // 初回同期：全データを取得
      await this.performFullSync()
      return
    }

    // 増分同期：最後の同期以降の変更を取得
    await this.performIncrementalSync(lastSyncTime)
  }

  // キューエントリの処理
  private async processQueueEntry(entry: ISyncQueueEntry): Promise<void> {
    const { operation, table, recordId, data } = entry

    let url: string
    let method: string
    let body: any

    switch (table) {
      case 'tasks':
        url = `/api/actions/tasks`
        break
      case 'projects':
        url = `/api/actions/projects`
        break
      case 'pomodoroSessions':
        url = `/api/actions/pomodoro`
        break
      default:
        throw new Error(`Unsupported table: ${table}`)
    }

    const formData = new FormData()

    switch (operation) {
      case 'create':
        // 作成の場合
        Object.keys(data).forEach(key => {
          if (data[key] !== null && data[key] !== undefined) {
            formData.append(key, typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key])
          }
        })
        break

      case 'update':
        // 更新の場合
        formData.append('id', recordId)
        Object.keys(data).forEach(key => {
          if (data[key] !== null && data[key] !== undefined) {
            formData.append(key, typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key])
          }
        })
        break

      case 'delete':
        // 削除の場合
        if (table === 'tasks') {
          url = `/api/actions/tasks/${recordId}`
          method = 'DELETE'
        } else if (table === 'projects') {
          url = `/api/actions/projects/${recordId}`
          method = 'DELETE'
        } else if (table === 'pomodoroSessions') {
          url = `/api/actions/pomodoro/${recordId}`
          method = 'DELETE'
        }
        break
    }

    // Server Action の呼び出し（実際にはNext.jsのServer Actionsを使用）
    const response = await fetch(url, {
      method: method || 'POST',
      body: operation === 'delete' ? undefined : formData,
    })

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${response.statusText}`)
    }

    // ローカルデータの同期フラグをクリア
    await this.markAsSynced(table, recordId)
  }

  // 同期済みマークの設定
  private async markAsSynced(table: string, recordId: string): Promise<void> {
    const updateData = {
      isDirty: false,
      lastSync: Date.now(),
    }

    switch (table) {
      case 'tasks':
        await db.tasks.update(recordId, updateData)
        break
      case 'projects':
        await db.projects.update(recordId, updateData)
        break
      case 'pomodoroSessions':
        await db.pomodoroSessions.update(recordId, updateData)
        break
    }
  }

  // 全データ同期
  private async performFullSync(): Promise<void> {
    const userId = this.ensureUserId()

    try {
      // サーバーから全データを取得（実際のAPI呼び出し）
      const response = await fetch('/api/sync/full', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch server data')
      }

      const serverData = await response.json()

      // ローカルデータを更新
      await this.updateLocalDataFromServer(serverData)
    } catch (error) {
      console.error('Full sync failed:', error)
      throw error
    }
  }

  // 増分同期
  private async performIncrementalSync(since: number): Promise<void> {
    const userId = this.ensureUserId()

    try {
      const response = await fetch(`/api/sync/incremental?since=${since}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch incremental data')
      }

      const changes = await response.json()

      // 変更をローカルに適用
      await this.applyServerChanges(changes)
    } catch (error) {
      console.error('Incremental sync failed:', error)
      throw error
    }
  }

  // サーバーデータからローカルを更新
  private async updateLocalDataFromServer(serverData: {
    tasks: any[]
    projects: any[]
    pomodoroSessions: any[]
  }): Promise<void> {
    const userId = this.ensureUserId()

    await db.transaction('rw', db.tasks, db.projects, db.pomodoroSessions, async () => {
      // 既存データをクリア
      await db.tasks.where('userId').equals(userId).delete()
      await db.projects.where('userId').equals(userId).delete()
      await db.pomodoroSessions.where('userId').equals(userId).delete()

      // 新しいデータを挿入
      if (serverData.tasks?.length > 0) {
        const tasks = serverData.tasks.map(task => this.convertServerTaskToIDB(task))
        await db.tasks.bulkAdd(tasks)
      }

      if (serverData.projects?.length > 0) {
        const projects = serverData.projects.map(project => this.convertServerProjectToIDB(project))
        await db.projects.bulkAdd(projects)
      }

      if (serverData.pomodoroSessions?.length > 0) {
        const sessions = serverData.pomodoroSessions.map(session => this.convertServerSessionToIDB(session))
        await db.pomodoroSessions.bulkAdd(sessions)
      }
    })
  }

  // サーバーの変更をローカルに適用
  private async applyServerChanges(changes: {
    tasks: any[]
    projects: any[]
    pomodoroSessions: any[]
  }): Promise<void> {
    // タスクの変更を適用
    for (const task of changes.tasks || []) {
      const idbTask = this.convertServerTaskToIDB(task)

      const existing = await db.tasks.get(task.id)
      if (existing) {
        // 競合チェック
        if (existing.isDirty && existing.updatedAt > idbTask.updatedAt) {
          // ローカルの方が新しい場合は競合として記録
          await this.recordConflict('tasks', task.id, existing, idbTask)
          continue
        }

        await db.tasks.update(task.id, { ...idbTask, isDirty: false })
      } else {
        await db.tasks.add({ ...idbTask, isDirty: false })
      }
    }

    // プロジェクトの変更を適用（同様の処理）
    for (const project of changes.projects || []) {
      const idbProject = this.convertServerProjectToIDB(project)

      const existing = await db.projects.get(project.id)
      if (existing) {
        if (existing.isDirty && existing.updatedAt > idbProject.updatedAt) {
          await this.recordConflict('projects', project.id, existing, idbProject)
          continue
        }

        await db.projects.update(project.id, { ...idbProject, isDirty: false })
      } else {
        await db.projects.add({ ...idbProject, isDirty: false })
      }
    }

    // ポモドーロセッションの変更を適用（同様の処理）
    for (const session of changes.pomodoroSessions || []) {
      const idbSession = this.convertServerSessionToIDB(session)

      const existing = await db.pomodoroSessions.get(session.id)
      if (existing) {
        if (existing.isDirty && existing.updatedAt > idbSession.updatedAt) {
          await this.recordConflict('pomodoroSessions', session.id, existing, idbSession)
          continue
        }

        await db.pomodoroSessions.update(session.id, { ...idbSession, isDirty: false })
      } else {
        await db.pomodoroSessions.add({ ...idbSession, isDirty: false })
      }
    }
  }

  // データ型変換関数
  private convertServerTaskToIDB(serverTask: any): IDBTask {
    return {
      ...serverTask,
      createdAt: new Date(serverTask.createdAt).getTime(),
      updatedAt: new Date(serverTask.updatedAt).getTime(),
      completedAt: serverTask.completedAt ? new Date(serverTask.completedAt).getTime() : null,
      dueDate: serverTask.dueDate ? new Date(serverTask.dueDate).getTime() : null,
      lastSync: Date.now(),
    }
  }

  private convertServerProjectToIDB(serverProject: any): IDBProject {
    return {
      ...serverProject,
      createdAt: new Date(serverProject.createdAt).getTime(),
      updatedAt: new Date(serverProject.updatedAt).getTime(),
      dueDate: serverProject.dueDate ? new Date(serverProject.dueDate).getTime() : null,
      lastSync: Date.now(),
    }
  }

  private convertServerSessionToIDB(serverSession: any): IDBPomodoroSession {
    return {
      ...serverSession,
      startTime: new Date(serverSession.startTime).getTime(),
      endTime: serverSession.endTime ? new Date(serverSession.endTime).getTime() : null,
      createdAt: new Date(serverSession.createdAt).getTime(),
      updatedAt: new Date(serverSession.updatedAt).getTime(),
      lastSync: Date.now(),
    }
  }

  // 競合の記録
  private async recordConflict(table: string, recordId: string, localData: any, serverData: any): Promise<void> {
    // 競合データを記録（実装は簡略化）
    const conflictKey = `conflict_${table}_${recordId}`
    localStorage.setItem(conflictKey, JSON.stringify({
      table,
      recordId,
      localData,
      serverData,
      timestamp: Date.now(),
    }))

    console.warn(`Conflict detected for ${table}:${recordId}`)
  }

  // 競合解決
  async resolveConflicts(resolution: ConflictResolution = 'manual'): Promise<void> {
    const conflicts = this.getStoredConflicts()

    for (const conflict of conflicts) {
      try {
        await this.resolveConflict(conflict, resolution)
        this.removeStoredConflict(conflict.recordId)
      } catch (error) {
        console.error(`Failed to resolve conflict for ${conflict.table}:${conflict.recordId}`, error)
      }
    }
  }

  private getStoredConflicts(): any[] {
    const conflicts: any[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('conflict_')) {
        const conflictData = localStorage.getItem(key)
        if (conflictData) {
          conflicts.push(JSON.parse(conflictData))
        }
      }
    }
    return conflicts
  }

  private removeStoredConflict(recordId: string): void {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.includes(recordId)) {
        localStorage.removeItem(key)
        break
      }
    }
  }

  private async resolveConflict(conflict: any, resolution: ConflictResolution): Promise<void> {
    const { table, recordId, localData, serverData } = conflict

    let resolvedData: any

    switch (resolution) {
      case 'local':
        resolvedData = localData
        break
      case 'remote':
        resolvedData = serverData
        break
      case 'manual':
        // 手動解決の場合はUIで処理（ここでは簡略化）
        return
    }

    // 解決されたデータでローカルを更新
    switch (table) {
      case 'tasks':
        await db.tasks.update(recordId, { ...resolvedData, isDirty: true })
        break
      case 'projects':
        await db.projects.update(recordId, { ...resolvedData, isDirty: true })
        break
      case 'pomodoroSessions':
        await db.pomodoroSessions.update(recordId, { ...resolvedData, isDirty: true })
        break
    }
  }

  // 完了したキューエントリのクリーンアップ
  private async cleanupCompletedEntries(): Promise<void> {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)

    // 1週間以上前の成功エントリを削除
    await db.syncQueue
      .where('timestamp')
      .below(oneWeekAgo)
      .and(entry => entry.retryCount === 0)
      .delete()

    // 10回以上失敗したエントリを削除
    await db.syncQueue
      .where('retryCount')
      .aboveOrEqual(10)
      .delete()
  }

  // 強制同期（競合を無視してサーバーを優先）
  async forceSync(): Promise<void> {
    const userId = this.ensureUserId()

    this.isSyncing = true
    this.notifyListeners()

    try {
      // ローカルの未同期データを削除
      await db.syncQueue.clear()

      // サーバーから全データを再取得
      await this.performFullSync()

      this.setLastSyncTime(Date.now())
    } finally {
      this.isSyncing = false
      this.notifyListeners()
    }
  }

  // オフラインモードの切り替え
  setOfflineMode(offline: boolean): void {
    if (offline) {
      this.isOnline = false
      this.stopAutoSync()
    } else {
      this.isOnline = navigator.onLine
      if (this.isOnline) {
        this.triggerSync()
      }
    }
    this.notifyListeners()
  }
}

// シングルトンインスタンス
export const syncManager = new SyncManager()

// React hook
export function useSyncManager() {
  const [status, setStatus] = React.useState<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncTime: null,
    pendingChanges: 0,
    errors: [],
  })

  React.useEffect(() => {
    const updateStatus = async () => {
      const currentStatus = await syncManager.getStatus()
      setStatus(currentStatus)
    }

    updateStatus()
    const unsubscribe = syncManager.addListener(setStatus)

    return unsubscribe
  }, [])

  return {
    status,
    triggerSync: () => syncManager.triggerSync(),
    forceSync: () => syncManager.forceSync(),
    startAutoSync: (interval?: number) => syncManager.startAutoSync(interval),
    stopAutoSync: () => syncManager.stopAutoSync(),
    setOfflineMode: (offline: boolean) => syncManager.setOfflineMode(offline),
  }
}

// React インポート（実際のファイルでは必要）
import React from 'react'
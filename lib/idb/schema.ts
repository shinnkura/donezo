import Dexie, { Table } from 'dexie'
import { Task, Project, Priority, TaskStatus } from '@prisma/client'

// IndexedDB用の型定義
export interface IDBTask extends Omit<Task, 'createdAt' | 'updatedAt' | 'completedAt' | 'dueDate'> {
  createdAt: number // Unix timestamp
  updatedAt: number // Unix timestamp
  completedAt?: number | null // Unix timestamp
  dueDate?: number | null // Unix timestamp

  // オフライン用の追加フィールド
  isDirty?: boolean // サーバーと同期が必要
  isDeleted?: boolean // 削除マーク
  lastSync?: number // 最後の同期時刻
  conflictData?: any // 競合データ
}

export interface IDBProject extends Omit<Project, 'createdAt' | 'updatedAt' | 'dueDate'> {
  createdAt: number // Unix timestamp
  updatedAt: number // Unix timestamp
  dueDate?: number | null // Unix timestamp

  // オフライン用の追加フィールド
  isDirty?: boolean
  isDeleted?: boolean
  lastSync?: number
  conflictData?: any
}

export interface IDBPomodoroSession {
  id: string
  userId: string
  type: 'pomodoro' | 'short_break' | 'long_break' | 'custom'
  duration: number // 秒
  startTime: number // Unix timestamp
  endTime?: number | null // Unix timestamp
  taskId?: string | null
  completed: boolean
  paused?: boolean
  pausedDuration?: number // 秒
  actualDuration?: number // 秒
  notes?: string | null
  createdAt: number
  updatedAt: number

  // オフライン用の追加フィールド
  isDirty?: boolean
  isDeleted?: boolean
  lastSync?: number
  conflictData?: any
}

// 同期キューのエントリ
export interface ISyncQueueEntry {
  id?: number
  operation: 'create' | 'update' | 'delete'
  table: 'tasks' | 'projects' | 'pomodoroSessions'
  recordId: string
  data: any
  timestamp: number
  retryCount: number
  error?: string
  priority: number // 0が最高優先度
}

// オフライン変更ログ
export interface IChangeLog {
  id?: number
  table: 'tasks' | 'projects' | 'pomodoroSessions'
  recordId: string
  operation: 'create' | 'update' | 'delete'
  oldData?: any
  newData?: any
  timestamp: number
  userId: string
  synced: boolean
}

// 設定情報
export interface IAppSettings {
  id?: number
  userId: string
  settings: any // JSON形式で保存
  updatedAt: number
  isDirty?: boolean
}

// 統計情報のキャッシュ
export interface IStatsCache {
  id?: number
  userId: string
  type: string // 'daily', 'weekly', 'monthly', etc.
  data: any
  calculatedAt: number
  expiresAt: number
}

// データベースクラス
export class DonezoDatabase extends Dexie {
  tasks!: Table<IDBTask>
  projects!: Table<IDBProject>
  pomodoroSessions!: Table<IDBPomodoroSession>
  syncQueue!: Table<ISyncQueueEntry>
  changeLog!: Table<IChangeLog>
  settings!: Table<IAppSettings>
  statsCache!: Table<IStatsCache>

  constructor() {
    super('DonezoDatabase')

    // データベーススキーマの定義
    this.version(1).stores({
      tasks: '&id, userId, projectId, parentTaskId, status, priority, dueDate, createdAt, updatedAt, isDirty, isDeleted, position',
      projects: '&id, userId, isActive, createdAt, updatedAt, isDirty, isDeleted, position',
      pomodoroSessions: '&id, userId, taskId, type, startTime, endTime, completed, createdAt, updatedAt, isDirty, isDeleted',
      syncQueue: '++id, table, recordId, timestamp, priority, retryCount',
      changeLog: '++id, table, recordId, timestamp, userId, synced',
      settings: '++id, &userId, updatedAt',
      statsCache: '++id, userId, type, calculatedAt, expiresAt',
    })

    // フックの設定
    this.tasks.hook('creating', (primKey, obj, trans) => {
      const now = Date.now()
      obj.createdAt = now
      obj.updatedAt = now
      obj.isDirty = true
    })

    this.tasks.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.updatedAt = Date.now()
      modifications.isDirty = true
    })

    this.projects.hook('creating', (primKey, obj, trans) => {
      const now = Date.now()
      obj.createdAt = now
      obj.updatedAt = now
      obj.isDirty = true
    })

    this.projects.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.updatedAt = Date.now()
      modifications.isDirty = true
    })

    this.pomodoroSessions.hook('creating', (primKey, obj, trans) => {
      const now = Date.now()
      obj.createdAt = now
      obj.updatedAt = now
      obj.isDirty = true
    })

    this.pomodoroSessions.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.updatedAt = Date.now()
      modifications.isDirty = true
    })

    // 削除時の処理
    this.tasks.hook('deleting', (primKey, obj, trans) => {
      // 物理削除ではなく論理削除
      trans.abort()
      this.tasks.update(primKey, { isDeleted: true, updatedAt: Date.now(), isDirty: true })
    })

    this.projects.hook('deleting', (primKey, obj, trans) => {
      trans.abort()
      this.projects.update(primKey, { isDeleted: true, updatedAt: Date.now(), isDirty: true })
    })

    this.pomodoroSessions.hook('deleting', (primKey, obj, trans) => {
      trans.abort()
      this.pomodoroSessions.update(primKey, { isDeleted: true, updatedAt: Date.now(), isDirty: true })
    })
  }

  // ユーザー固有のデータを取得
  async getUserTasks(userId: string, includeDeleted = false): Promise<IDBTask[]> {
    const query = this.tasks.where('userId').equals(userId)

    if (!includeDeleted) {
      return query.and(task => !task.isDeleted).toArray()
    }

    return query.toArray()
  }

  async getUserProjects(userId: string, includeDeleted = false): Promise<IDBProject[]> {
    const query = this.projects.where('userId').equals(userId)

    if (!includeDeleted) {
      return query.and(project => !project.isDeleted).toArray()
    }

    return query.toArray()
  }

  async getUserSessions(userId: string, includeDeleted = false): Promise<IDBPomodoroSession[]> {
    const query = this.pomodoroSessions.where('userId').equals(userId)

    if (!includeDeleted) {
      return query.and(session => !session.isDeleted).toArray()
    }

    return query.toArray()
  }

  // 未同期データを取得
  async getDirtyTasks(userId: string): Promise<IDBTask[]> {
    return this.tasks
      .where('userId')
      .equals(userId)
      .and(task => task.isDirty === true)
      .toArray()
  }

  async getDirtyProjects(userId: string): Promise<IDBProject[]> {
    return this.projects
      .where('userId')
      .equals(userId)
      .and(project => project.isDirty === true)
      .toArray()
  }

  async getDirtySessions(userId: string): Promise<IDBPomodoroSession[]> {
    return this.pomodoroSessions
      .where('userId')
      .equals(userId)
      .and(session => session.isDirty === true)
      .toArray()
  }

  // 統計用のクエリ
  async getTasksByStatus(userId: string, status: TaskStatus): Promise<IDBTask[]> {
    return this.tasks
      .where('userId')
      .equals(userId)
      .and(task => task.status === status && !task.isDeleted)
      .toArray()
  }

  async getTasksByProject(userId: string, projectId: string): Promise<IDBTask[]> {
    return this.tasks
      .where('userId')
      .equals(userId)
      .and(task => task.projectId === projectId && !task.isDeleted)
      .toArray()
  }

  async getSessionsByDateRange(userId: string, startDate: number, endDate: number): Promise<IDBPomodoroSession[]> {
    return this.pomodoroSessions
      .where('userId')
      .equals(userId)
      .and(session =>
        session.startTime >= startDate &&
        session.startTime <= endDate &&
        !session.isDeleted
      )
      .toArray()
  }

  // 期限切れタスクの取得
  async getOverdueTasks(userId: string): Promise<IDBTask[]> {
    const now = Date.now()
    return this.tasks
      .where('userId')
      .equals(userId)
      .and(task =>
        task.dueDate !== null &&
        task.dueDate !== undefined &&
        task.dueDate < now &&
        task.status !== 'COMPLETED' &&
        !task.isDeleted
      )
      .toArray()
  }

  // 完了済みタスクのアーカイブ
  async archiveCompletedTasks(userId: string, olderThanDays: number = 30): Promise<number> {
    const cutoffDate = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000)

    const tasksToArchive = await this.tasks
      .where('userId')
      .equals(userId)
      .and(task =>
        task.status === 'COMPLETED' &&
        task.completedAt !== null &&
        task.completedAt !== undefined &&
        task.completedAt < cutoffDate &&
        !task.archived
      )
      .toArray()

    if (tasksToArchive.length > 0) {
      await this.tasks.bulkUpdate(
        tasksToArchive.map(task => [task.id, { archived: true, isDirty: true }])
      )
    }

    return tasksToArchive.length
  }

  // データベースのクリーンアップ
  async cleanup(userId: string): Promise<void> {
    const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)

    // 古い変更ログを削除
    await this.changeLog
      .where('timestamp')
      .below(oneMonthAgo)
      .and(log => log.synced === true)
      .delete()

    // 古い統計キャッシュを削除
    await this.statsCache
      .where('expiresAt')
      .below(Date.now())
      .delete()

    // 失敗した同期キューエントリを削除（7日以上経過）
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
    await this.syncQueue
      .where('timestamp')
      .below(oneWeekAgo)
      .and(entry => entry.retryCount > 10)
      .delete()
  }

  // データベース全体のリセット
  async resetUserData(userId: string): Promise<void> {
    await this.transaction('rw', this.tasks, this.projects, this.pomodoroSessions, this.changeLog, this.settings, async () => {
      await this.tasks.where('userId').equals(userId).delete()
      await this.projects.where('userId').equals(userId).delete()
      await this.pomodoroSessions.where('userId').equals(userId).delete()
      await this.changeLog.where('userId').equals(userId).delete()
      await this.settings.where('userId').equals(userId).delete()
    })
  }

  // データベースサイズの取得
  async getDatabaseSize(): Promise<{ tables: Record<string, number>; total: number }> {
    const sizes = {
      tasks: await this.tasks.count(),
      projects: await this.projects.count(),
      pomodoroSessions: await this.pomodoroSessions.count(),
      syncQueue: await this.syncQueue.count(),
      changeLog: await this.changeLog.count(),
      settings: await this.settings.count(),
      statsCache: await this.statsCache.count(),
    }

    const total = Object.values(sizes).reduce((sum, count) => sum + count, 0)

    return { tables: sizes, total }
  }
}

// シングルトンインスタンス
export const db = new DonezoDatabase()

// データベースの初期化とマイグレーション
export async function initializeDatabase(): Promise<void> {
  try {
    await db.open()
    console.log('IndexedDB initialized successfully')
  } catch (error) {
    console.error('Failed to initialize IndexedDB:', error)
    throw error
  }
}

// ユーティリティ関数
export function dateToTimestamp(date: Date | string | null): number | null {
  if (!date) return null
  return new Date(date).getTime()
}

export function timestampToDate(timestamp: number | null): Date | null {
  if (!timestamp) return null
  return new Date(timestamp)
}

// Prisma型からIndexedDB型への変換
export function taskToIDBTask(task: Task): IDBTask {
  return {
    ...task,
    createdAt: task.createdAt.getTime(),
    updatedAt: task.updatedAt.getTime(),
    completedAt: task.completedAt ? task.completedAt.getTime() : null,
    dueDate: task.dueDate ? task.dueDate.getTime() : null,
    isDirty: false,
    isDeleted: false,
    lastSync: Date.now(),
  }
}

export function projectToIDBProject(project: Project): IDBProject {
  return {
    ...project,
    createdAt: project.createdAt.getTime(),
    updatedAt: project.updatedAt.getTime(),
    dueDate: project.dueDate ? project.dueDate.getTime() : null,
    isDirty: false,
    isDeleted: false,
    lastSync: Date.now(),
  }
}

// IndexedDB型からPrisma型への変換
export function idbTaskToTask(idbTask: IDBTask): Task {
  return {
    ...idbTask,
    createdAt: new Date(idbTask.createdAt),
    updatedAt: new Date(idbTask.updatedAt),
    completedAt: idbTask.completedAt ? new Date(idbTask.completedAt) : null,
    dueDate: idbTask.dueDate ? new Date(idbTask.dueDate) : null,
  } as Task
}

export function idbProjectToProject(idbProject: IDBProject): Project {
  return {
    ...idbProject,
    createdAt: new Date(idbProject.createdAt),
    updatedAt: new Date(idbProject.updatedAt),
    dueDate: idbProject.dueDate ? new Date(idbProject.dueDate) : null,
  } as Project
}
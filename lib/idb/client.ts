'use client'

import { db, IDBTask, IDBProject, IDBPomodoroSession, IChangeLog, ISyncQueueEntry } from './schema'
import { Task, Project, TaskStatus, Priority } from '@prisma/client'

// IndexedDBクライアントクラス
export class IndexedDBClient {
  private userId: string | null = null

  constructor(userId?: string) {
    if (userId) {
      this.setUserId(userId)
    }
  }

  setUserId(userId: string): void {
    this.userId = userId
  }

  private ensureUserId(): string {
    if (!this.userId) {
      throw new Error('User ID is not set')
    }
    return this.userId
  }

  // タスク操作
  async createTask(task: Omit<IDBTask, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<IDBTask> {
    const userId = this.ensureUserId()
    const now = Date.now()

    const newTask: IDBTask = {
      ...task,
      id: `task_${now}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      createdAt: now,
      updatedAt: now,
      isDirty: true,
      isDeleted: false,
    }

    await db.tasks.add(newTask)
    await this.addToSyncQueue('create', 'tasks', newTask.id, newTask)
    await this.logChange('tasks', newTask.id, 'create', null, newTask)

    return newTask
  }

  async updateTask(taskId: string, updates: Partial<IDBTask>): Promise<IDBTask | null> {
    const userId = this.ensureUserId()

    const existingTask = await db.tasks.get(taskId)
    if (!existingTask || existingTask.userId !== userId || existingTask.isDeleted) {
      return null
    }

    const updatedFields = {
      ...updates,
      updatedAt: Date.now(),
      isDirty: true,
    }

    await db.tasks.update(taskId, updatedFields)
    await this.addToSyncQueue('update', 'tasks', taskId, updatedFields)
    await this.logChange('tasks', taskId, 'update', existingTask, { ...existingTask, ...updatedFields })

    return { ...existingTask, ...updatedFields }
  }

  async deleteTask(taskId: string): Promise<boolean> {
    const userId = this.ensureUserId()

    const existingTask = await db.tasks.get(taskId)
    if (!existingTask || existingTask.userId !== userId) {
      return false
    }

    // 論理削除
    await db.tasks.update(taskId, {
      isDeleted: true,
      updatedAt: Date.now(),
      isDirty: true,
    })

    await this.addToSyncQueue('delete', 'tasks', taskId, null)
    await this.logChange('tasks', taskId, 'delete', existingTask, null)

    return true
  }

  async getTask(taskId: string): Promise<IDBTask | null> {
    const userId = this.ensureUserId()

    const task = await db.tasks.get(taskId)
    if (!task || task.userId !== userId || task.isDeleted) {
      return null
    }

    return task
  }

  async getTasks(filters?: {
    projectId?: string
    status?: TaskStatus
    priority?: Priority
    search?: string
    includeArchived?: boolean
  }): Promise<IDBTask[]> {
    const userId = this.ensureUserId()

    let query = db.tasks.where('userId').equals(userId)

    // 削除されたタスクを除外
    const tasks = await query.and(task => !task.isDeleted).toArray()

    let filteredTasks = tasks

    // フィルタを適用
    if (filters) {
      if (filters.projectId) {
        filteredTasks = filteredTasks.filter(task => task.projectId === filters.projectId)
      }

      if (filters.status) {
        filteredTasks = filteredTasks.filter(task => task.status === filters.status)
      }

      if (filters.priority) {
        filteredTasks = filteredTasks.filter(task => task.priority === filters.priority)
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filteredTasks = filteredTasks.filter(task =>
          task.title.toLowerCase().includes(searchLower) ||
          (task.description && task.description.toLowerCase().includes(searchLower))
        )
      }

      if (!filters.includeArchived) {
        filteredTasks = filteredTasks.filter(task => !task.archived)
      }
    }

    // 位置でソート
    return filteredTasks.sort((a, b) => a.position - b.position)
  }

  async getSubtasks(parentTaskId: string): Promise<IDBTask[]> {
    const userId = this.ensureUserId()

    return db.tasks
      .where('userId')
      .equals(userId)
      .and(task => task.parentTaskId === parentTaskId && !task.isDeleted)
      .sortBy('position')
  }

  // プロジェクト操作
  async createProject(project: Omit<IDBProject, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<IDBProject> {
    const userId = this.ensureUserId()
    const now = Date.now()

    const newProject: IDBProject = {
      ...project,
      id: `project_${now}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      createdAt: now,
      updatedAt: now,
      isDirty: true,
      isDeleted: false,
    }

    await db.projects.add(newProject)
    await this.addToSyncQueue('create', 'projects', newProject.id, newProject)
    await this.logChange('projects', newProject.id, 'create', null, newProject)

    return newProject
  }

  async updateProject(projectId: string, updates: Partial<IDBProject>): Promise<IDBProject | null> {
    const userId = this.ensureUserId()

    const existingProject = await db.projects.get(projectId)
    if (!existingProject || existingProject.userId !== userId || existingProject.isDeleted) {
      return null
    }

    const updatedFields = {
      ...updates,
      updatedAt: Date.now(),
      isDirty: true,
    }

    await db.projects.update(projectId, updatedFields)
    await this.addToSyncQueue('update', 'projects', projectId, updatedFields)
    await this.logChange('projects', projectId, 'update', existingProject, { ...existingProject, ...updatedFields })

    return { ...existingProject, ...updatedFields }
  }

  async deleteProject(projectId: string): Promise<boolean> {
    const userId = this.ensureUserId()

    const existingProject = await db.projects.get(projectId)
    if (!existingProject || existingProject.userId !== userId) {
      return false
    }

    // 論理削除
    await db.projects.update(projectId, {
      isDeleted: true,
      updatedAt: Date.now(),
      isDirty: true,
    })

    await this.addToSyncQueue('delete', 'projects', projectId, null)
    await this.logChange('projects', projectId, 'delete', existingProject, null)

    return true
  }

  async getProject(projectId: string): Promise<IDBProject | null> {
    const userId = this.ensureUserId()

    const project = await db.projects.get(projectId)
    if (!project || project.userId !== userId || project.isDeleted) {
      return null
    }

    return project
  }

  async getProjects(includeInactive = false): Promise<IDBProject[]> {
    const userId = this.ensureUserId()

    let query = db.projects.where('userId').equals(userId)
    const projects = await query.and(project => !project.isDeleted).toArray()

    let filteredProjects = projects

    if (!includeInactive) {
      filteredProjects = filteredProjects.filter(project => project.isActive)
    }

    return filteredProjects.sort((a, b) => a.position - b.position)
  }

  // ポモドーロセッション操作
  async createPomodoroSession(session: Omit<IDBPomodoroSession, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<IDBPomodoroSession> {
    const userId = this.ensureUserId()
    const now = Date.now()

    const newSession: IDBPomodoroSession = {
      ...session,
      id: `session_${now}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      createdAt: now,
      updatedAt: now,
      isDirty: true,
      isDeleted: false,
    }

    await db.pomodoroSessions.add(newSession)
    await this.addToSyncQueue('create', 'pomodoroSessions', newSession.id, newSession)
    await this.logChange('pomodoroSessions', newSession.id, 'create', null, newSession)

    return newSession
  }

  async updatePomodoroSession(sessionId: string, updates: Partial<IDBPomodoroSession>): Promise<IDBPomodoroSession | null> {
    const userId = this.ensureUserId()

    const existingSession = await db.pomodoroSessions.get(sessionId)
    if (!existingSession || existingSession.userId !== userId || existingSession.isDeleted) {
      return null
    }

    const updatedFields = {
      ...updates,
      updatedAt: Date.now(),
      isDirty: true,
    }

    await db.pomodoroSessions.update(sessionId, updatedFields)
    await this.addToSyncQueue('update', 'pomodoroSessions', sessionId, updatedFields)
    await this.logChange('pomodoroSessions', sessionId, 'update', existingSession, { ...existingSession, ...updatedFields })

    return { ...existingSession, ...updatedFields }
  }

  async getPomodoroSession(sessionId: string): Promise<IDBPomodoroSession | null> {
    const userId = this.ensureUserId()

    const session = await db.pomodoroSessions.get(sessionId)
    if (!session || session.userId !== userId || session.isDeleted) {
      return null
    }

    return session
  }

  async getPomodoroSessions(filters?: {
    taskId?: string
    type?: 'pomodoro' | 'short_break' | 'long_break' | 'custom'
    startDate?: number
    endDate?: number
    completed?: boolean
  }): Promise<IDBPomodoroSession[]> {
    const userId = this.ensureUserId()

    let query = db.pomodoroSessions.where('userId').equals(userId)
    const sessions = await query.and(session => !session.isDeleted).toArray()

    let filteredSessions = sessions

    if (filters) {
      if (filters.taskId) {
        filteredSessions = filteredSessions.filter(session => session.taskId === filters.taskId)
      }

      if (filters.type) {
        filteredSessions = filteredSessions.filter(session => session.type === filters.type)
      }

      if (filters.startDate) {
        filteredSessions = filteredSessions.filter(session => session.startTime >= filters.startDate!)
      }

      if (filters.endDate) {
        filteredSessions = filteredSessions.filter(session => session.startTime <= filters.endDate!)
      }

      if (filters.completed !== undefined) {
        filteredSessions = filteredSessions.filter(session => session.completed === filters.completed)
      }
    }

    return filteredSessions.sort((a, b) => b.startTime - a.startTime)
  }

  // 統計情報の取得
  async getTaskStatistics(): Promise<{
    total: number
    completed: number
    inProgress: number
    todo: number
    overdue: number
    byPriority: Record<Priority, number>
    byProject: Record<string, number>
  }> {
    const userId = this.ensureUserId()
    const tasks = await this.getTasks()

    const now = Date.now()
    const stats = {
      total: tasks.length,
      completed: 0,
      inProgress: 0,
      todo: 0,
      overdue: 0,
      byPriority: { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 } as Record<Priority, number>,
      byProject: {} as Record<string, number>,
    }

    for (const task of tasks) {
      // ステータス別
      switch (task.status) {
        case 'COMPLETED':
          stats.completed++
          break
        case 'IN_PROGRESS':
          stats.inProgress++
          break
        case 'TODO':
          stats.todo++
          break
      }

      // 期限切れチェック
      if (task.dueDate && task.dueDate < now && task.status !== 'COMPLETED') {
        stats.overdue++
      }

      // 優先度別
      stats.byPriority[task.priority]++

      // プロジェクト別
      if (task.projectId) {
        stats.byProject[task.projectId] = (stats.byProject[task.projectId] || 0) + 1
      } else {
        stats.byProject['none'] = (stats.byProject['none'] || 0) + 1
      }
    }

    return stats
  }

  async getPomodoroStatistics(days = 30): Promise<{
    totalSessions: number
    completedSessions: number
    totalFocusTime: number
    totalBreakTime: number
    averageSessionLength: number
    byDay: Record<string, { sessions: number; focusTime: number; breakTime: number }>
  }> {
    const userId = this.ensureUserId()
    const startDate = Date.now() - (days * 24 * 60 * 60 * 1000)

    const sessions = await this.getPomodoroSessions({
      startDate,
      completed: true,
    })

    const stats = {
      totalSessions: sessions.length,
      completedSessions: sessions.filter(s => s.completed).length,
      totalFocusTime: 0,
      totalBreakTime: 0,
      averageSessionLength: 0,
      byDay: {} as Record<string, { sessions: number; focusTime: number; breakTime: number }>,
    }

    let totalDuration = 0

    for (const session of sessions) {
      const duration = session.actualDuration || session.duration
      totalDuration += duration

      if (session.type === 'pomodoro') {
        stats.totalFocusTime += duration
      } else {
        stats.totalBreakTime += duration
      }

      // 日別統計
      const date = new Date(session.startTime).toISOString().split('T')[0]
      if (!stats.byDay[date]) {
        stats.byDay[date] = { sessions: 0, focusTime: 0, breakTime: 0 }
      }

      stats.byDay[date].sessions++
      if (session.type === 'pomodoro') {
        stats.byDay[date].focusTime += duration
      } else {
        stats.byDay[date].breakTime += duration
      }
    }

    stats.averageSessionLength = stats.completedSessions > 0 ? totalDuration / stats.completedSessions : 0

    return stats
  }

  // 同期キューの管理
  private async addToSyncQueue(
    operation: ISyncQueueEntry['operation'],
    table: ISyncQueueEntry['table'],
    recordId: string,
    data: any,
    priority = 1
  ): Promise<void> {
    const entry: ISyncQueueEntry = {
      operation,
      table,
      recordId,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      priority,
    }

    await db.syncQueue.add(entry)
  }

  async getSyncQueue(): Promise<ISyncQueueEntry[]> {
    return db.syncQueue.orderBy('priority').reverse().toArray()
  }

  async removeSyncQueueEntry(entryId: number): Promise<void> {
    await db.syncQueue.delete(entryId)
  }

  async incrementSyncRetry(entryId: number, error?: string): Promise<void> {
    await db.syncQueue.update(entryId, {
      retryCount: await db.syncQueue.get(entryId).then(entry => (entry?.retryCount || 0) + 1),
      error,
    })
  }

  // 変更ログの管理
  private async logChange(
    table: IChangeLog['table'],
    recordId: string,
    operation: IChangeLog['operation'],
    oldData: any,
    newData: any
  ): Promise<void> {
    const userId = this.ensureUserId()

    const log: IChangeLog = {
      table,
      recordId,
      operation,
      oldData,
      newData,
      timestamp: Date.now(),
      userId,
      synced: false,
    }

    await db.changeLog.add(log)
  }

  async getChangeLogs(synced?: boolean): Promise<IChangeLog[]> {
    const userId = this.ensureUserId()

    let query = db.changeLog.where('userId').equals(userId)

    if (synced !== undefined) {
      return query.and(log => log.synced === synced).toArray()
    }

    return query.toArray()
  }

  async markChangeLogSynced(logIds: number[]): Promise<void> {
    await db.changeLog.bulkUpdate(logIds.map(id => [id, { synced: true }]))
  }

  // データのクリーンアップ
  async cleanupOldData(days = 30): Promise<void> {
    const userId = this.ensureUserId()
    await db.cleanup(userId)
  }

  // オフラインデータの取得
  async getOfflineData(): Promise<{
    tasks: IDBTask[]
    projects: IDBProject[]
    sessions: IDBPomodoroSession[]
    syncQueue: ISyncQueueEntry[]
    changeLogs: IChangeLog[]
  }> {
    const userId = this.ensureUserId()

    const [tasks, projects, sessions, syncQueue, changeLogs] = await Promise.all([
      this.getTasks({ includeArchived: true }),
      this.getProjects(true),
      this.getPomodoroSessions(),
      this.getSyncQueue(),
      this.getChangeLogs(),
    ])

    return {
      tasks,
      projects,
      sessions,
      syncQueue,
      changeLogs,
    }
  }

  // データベースの状態情報
  async getDatabaseInfo(): Promise<{
    size: { tables: Record<string, number>; total: number }
    syncPending: number
    lastUpdate: number
  }> {
    const userId = this.ensureUserId()

    const [size, syncQueue] = await Promise.all([
      db.getDatabaseSize(),
      this.getSyncQueue(),
    ])

    const lastUpdate = Math.max(
      ...(await Promise.all([
        db.tasks.where('userId').equals(userId).reverse().sortBy('updatedAt').then(tasks => tasks[0]?.updatedAt || 0),
        db.projects.where('userId').equals(userId).reverse().sortBy('updatedAt').then(projects => projects[0]?.updatedAt || 0),
        db.pomodoroSessions.where('userId').equals(userId).reverse().sortBy('updatedAt').then(sessions => sessions[0]?.updatedAt || 0),
      ]))
    )

    return {
      size,
      syncPending: syncQueue.length,
      lastUpdate,
    }
  }
}

// シングルトンクライアントのエクスポート
export const idbClient = new IndexedDBClient()
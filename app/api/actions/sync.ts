'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// 同期データの型定義
interface SyncData {
  tasks: any[]
  projects: any[]
  pomodoroSessions: any[]
  lastSyncTime: string
  clientId: string
}

// バリデーションスキーマ
const syncDataSchema = z.object({
  tasks: z.array(z.any()),
  projects: z.array(z.any()),
  pomodoroSessions: z.array(z.any()),
  lastSyncTime: z.string(),
  clientId: z.string(),
})

const conflictResolutionSchema = z.object({
  conflictId: z.string(),
  resolution: z.enum(['local', 'remote', 'merge']),
  mergedData: z.any().optional(),
})

// 認証チェック関数
async function checkAuth() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect('/login')
  }
  return session.user.id
}

// データの同期
export async function syncData(formData: FormData) {
  try {
    const userId = await checkAuth()

    const data = {
      tasks: JSON.parse(formData.get('tasks') as string || '[]'),
      projects: JSON.parse(formData.get('projects') as string || '[]'),
      pomodoroSessions: JSON.parse(formData.get('pomodoroSessions') as string || '[]'),
      lastSyncTime: formData.get('lastSyncTime') as string,
      clientId: formData.get('clientId') as string,
    }

    const validatedData = syncDataSchema.parse(data)

    // ユーザーの最後の同期時刻を取得
    const userSyncInfo = await prisma.userSyncInfo.findUnique({
      where: { userId },
    })

    const serverLastSync = userSyncInfo?.lastSyncTime || new Date(0)
    const clientLastSync = new Date(validatedData.lastSyncTime)

    // サーバー側の変更を取得
    const serverChanges = await getServerChanges(userId, clientLastSync)

    // 競合を検出
    const conflicts = await detectConflicts(validatedData, serverChanges, userId)

    if (conflicts.length > 0) {
      // 競合がある場合は、競合情報を返す
      return {
        success: false,
        conflicts,
        requiresResolution: true,
      }
    }

    // 競合がない場合、データを同期
    const syncResult = await performSync(validatedData, serverChanges, userId)

    // 同期情報を更新
    await prisma.userSyncInfo.upsert({
      where: { userId },
      update: {
        lastSyncTime: new Date(),
        clientId: validatedData.clientId,
      },
      create: {
        userId,
        lastSyncTime: new Date(),
        clientId: validatedData.clientId,
      },
    })

    revalidatePath('/tasks')
    revalidatePath('/projects')
    revalidatePath('/timer')
    revalidatePath('/reports')

    return {
      success: true,
      syncResult,
      serverChanges,
    }
  } catch (error) {
    console.error('Sync error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'データの同期に失敗しました',
    }
  }
}

// サーバー側の変更を取得
async function getServerChanges(userId: string, since: Date) {
  const [tasks, projects, pomodoroSessions] = await Promise.all([
    prisma.task.findMany({
      where: {
        userId,
        updatedAt: { gt: since },
      },
      include: {
        project: true,
        parentTask: true,
        subtasks: true,
      },
    }),
    prisma.project.findMany({
      where: {
        userId,
        updatedAt: { gt: since },
      },
      include: {
        tasks: {
          where: { archived: false },
        },
      },
    }),
    prisma.pomodoroSession.findMany({
      where: {
        userId,
        updatedAt: { gt: since },
      },
      include: {
        task: true,
      },
    }),
  ])

  return {
    tasks,
    projects,
    pomodoroSessions,
  }
}

// 競合を検出
async function detectConflicts(clientData: SyncData, serverChanges: any, userId: string) {
  const conflicts: any[] = []

  // タスクの競合チェック
  for (const clientTask of clientData.tasks) {
    const serverTask = serverChanges.tasks.find((t: any) => t.id === clientTask.id)
    if (serverTask && isConflicted(clientTask, serverTask)) {
      conflicts.push({
        id: `task-${clientTask.id}`,
        type: 'task',
        clientData: clientTask,
        serverData: serverTask,
        conflictFields: getConflictFields(clientTask, serverTask),
      })
    }
  }

  // プロジェクトの競合チェック
  for (const clientProject of clientData.projects) {
    const serverProject = serverChanges.projects.find((p: any) => p.id === clientProject.id)
    if (serverProject && isConflicted(clientProject, serverProject)) {
      conflicts.push({
        id: `project-${clientProject.id}`,
        type: 'project',
        clientData: clientProject,
        serverData: serverProject,
        conflictFields: getConflictFields(clientProject, serverProject),
      })
    }
  }

  // ポモドーロセッションの競合チェック
  for (const clientSession of clientData.pomodoroSessions) {
    const serverSession = serverChanges.pomodoroSessions.find((s: any) => s.id === clientSession.id)
    if (serverSession && isConflicted(clientSession, serverSession)) {
      conflicts.push({
        id: `session-${clientSession.id}`,
        type: 'pomodoroSession',
        clientData: clientSession,
        serverData: serverSession,
        conflictFields: getConflictFields(clientSession, serverSession),
      })
    }
  }

  return conflicts
}

// 競合があるかチェック
function isConflicted(clientData: any, serverData: any): boolean {
  // 更新時刻が異なり、かつ内容も異なる場合は競合とみなす
  const clientUpdated = new Date(clientData.updatedAt)
  const serverUpdated = new Date(serverData.updatedAt)

  if (clientUpdated.getTime() === serverUpdated.getTime()) {
    return false
  }

  // 重要なフィールドが異なるかチェック
  const importantFields = ['title', 'description', 'status', 'priority', 'dueDate', 'completed']

  return importantFields.some(field => {
    const clientValue = clientData[field]
    const serverValue = serverData[field]

    // 日付の場合は文字列として比較
    if (field.includes('Date') || field.includes('Time')) {
      return new Date(clientValue || 0).getTime() !== new Date(serverValue || 0).getTime()
    }

    return clientValue !== serverValue
  })
}

// 競合フィールドを取得
function getConflictFields(clientData: any, serverData: any): string[] {
  const conflicts: string[] = []
  const fieldsToCheck = Object.keys(clientData)

  for (const field of fieldsToCheck) {
    if (clientData[field] !== serverData[field]) {
      conflicts.push(field)
    }
  }

  return conflicts
}

// 実際の同期を実行
async function performSync(clientData: SyncData, serverChanges: any, userId: string) {
  const syncResult = {
    tasksCreated: 0,
    tasksUpdated: 0,
    projectsCreated: 0,
    projectsUpdated: 0,
    sessionsCreated: 0,
    sessionsUpdated: 0,
  }

  await prisma.$transaction(async (tx) => {
    // クライアントからのタスクを処理
    for (const clientTask of clientData.tasks) {
      const { id, createdAt, updatedAt, ...taskData } = clientTask

      const existingTask = await tx.task.findUnique({
        where: { id },
      })

      if (existingTask) {
        await tx.task.update({
          where: { id },
          data: taskData,
        })
        syncResult.tasksUpdated++
      } else {
        await tx.task.create({
          data: {
            id,
            ...taskData,
            userId,
          },
        })
        syncResult.tasksCreated++
      }
    }

    // クライアントからのプロジェクトを処理
    for (const clientProject of clientData.projects) {
      const { id, createdAt, updatedAt, ...projectData } = clientProject

      const existingProject = await tx.project.findUnique({
        where: { id },
      })

      if (existingProject) {
        await tx.project.update({
          where: { id },
          data: projectData,
        })
        syncResult.projectsUpdated++
      } else {
        await tx.project.create({
          data: {
            id,
            ...projectData,
            userId,
          },
        })
        syncResult.projectsCreated++
      }
    }

    // クライアントからのポモドーロセッションを処理
    for (const clientSession of clientData.pomodoroSessions) {
      const { id, createdAt, updatedAt, ...sessionData } = clientSession

      const existingSession = await tx.pomodoroSession.findUnique({
        where: { id },
      })

      if (existingSession) {
        await tx.pomodoroSession.update({
          where: { id },
          data: sessionData,
        })
        syncResult.sessionsUpdated++
      } else {
        await tx.pomodoroSession.create({
          data: {
            id,
            ...sessionData,
            userId,
          },
        })
        syncResult.sessionsCreated++
      }
    }
  })

  return syncResult
}

// 競合解決
export async function resolveConflict(formData: FormData) {
  try {
    const userId = await checkAuth()

    const data = {
      conflictId: formData.get('conflictId') as string,
      resolution: formData.get('resolution') as string,
      mergedData: formData.get('mergedData') ? JSON.parse(formData.get('mergedData') as string) : undefined,
    }

    const validatedData = conflictResolutionSchema.parse(data)

    const [type, id] = validatedData.conflictId.split('-')

    let resolvedData: any

    switch (validatedData.resolution) {
      case 'local':
        // クライアント側のデータを採用（何もしない）
        return { success: true, action: 'use_local' }

      case 'remote':
        // サーバー側のデータを採用
        resolvedData = await getServerDataById(type, id, userId)
        break

      case 'merge':
        // マージされたデータを使用
        resolvedData = validatedData.mergedData
        break
    }

    if (resolvedData) {
      await updateDataById(type, id, resolvedData, userId)
    }

    revalidatePath('/tasks')
    revalidatePath('/projects')
    revalidatePath('/timer')

    return { success: true, resolvedData }
  } catch (error) {
    console.error('Conflict resolution error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '競合の解決に失敗しました',
    }
  }
}

// IDによるサーバーデータ取得
async function getServerDataById(type: string, id: string, userId: string) {
  switch (type) {
    case 'task':
      return await prisma.task.findFirst({
        where: { id, userId },
        include: {
          project: true,
          parentTask: true,
          subtasks: true,
        },
      })

    case 'project':
      return await prisma.project.findFirst({
        where: { id, userId },
        include: {
          tasks: {
            where: { archived: false },
          },
        },
      })

    case 'pomodoroSession':
      return await prisma.pomodoroSession.findFirst({
        where: { id, userId },
        include: {
          task: true,
        },
      })

    default:
      throw new Error('無効なデータタイプです')
  }
}

// IDによるデータ更新
async function updateDataById(type: string, id: string, data: any, userId: string) {
  const { createdAt, updatedAt, ...updateData } = data

  switch (type) {
    case 'task':
      return await prisma.task.update({
        where: { id },
        data: updateData,
      })

    case 'project':
      return await prisma.project.update({
        where: { id },
        data: updateData,
      })

    case 'pomodoroSession':
      return await prisma.pomodoroSession.update({
        where: { id },
        data: updateData,
      })

    default:
      throw new Error('無効なデータタイプです')
  }
}

// フルリセット同期
export async function resetSync() {
  try {
    const userId = await checkAuth()

    // 同期情報をリセット
    await prisma.userSyncInfo.deleteMany({
      where: { userId },
    })

    // 全データを最新の状態で取得
    const [tasks, projects, pomodoroSessions] = await Promise.all([
      prisma.task.findMany({
        where: { userId },
        include: {
          project: true,
          parentTask: true,
          subtasks: true,
        },
      }),
      prisma.project.findMany({
        where: { userId },
        include: {
          tasks: {
            where: { archived: false },
          },
        },
      }),
      prisma.pomodoroSession.findMany({
        where: { userId },
        include: {
          task: true,
        },
      }),
    ])

    return {
      success: true,
      data: {
        tasks,
        projects,
        pomodoroSessions,
        lastSyncTime: new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error('Reset sync error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '同期のリセットに失敗しました',
    }
  }
}

// 同期状態取得
export async function getSyncStatus() {
  try {
    const userId = await checkAuth()

    const syncInfo = await prisma.userSyncInfo.findUnique({
      where: { userId },
    })

    const pendingChanges = await getPendingChangesCount(userId, syncInfo?.lastSyncTime || new Date(0))

    return {
      success: true,
      syncStatus: {
        lastSyncTime: syncInfo?.lastSyncTime || null,
        clientId: syncInfo?.clientId || null,
        pendingChanges,
        isOnline: true, // これは実際にはクライアント側で判定
      },
    }
  } catch (error) {
    console.error('Sync status error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '同期状態の取得に失敗しました',
    }
  }
}

// 未同期の変更数を取得
async function getPendingChangesCount(userId: string, lastSyncTime: Date) {
  const [taskCount, projectCount, sessionCount] = await Promise.all([
    prisma.task.count({
      where: {
        userId,
        updatedAt: { gt: lastSyncTime },
      },
    }),
    prisma.project.count({
      where: {
        userId,
        updatedAt: { gt: lastSyncTime },
      },
    }),
    prisma.pomodoroSession.count({
      where: {
        userId,
        updatedAt: { gt: lastSyncTime },
      },
    }),
  ])

  return taskCount + projectCount + sessionCount
}

// バックアップの作成
export async function createBackup() {
  try {
    const userId = await checkAuth()

    const [tasks, projects, pomodoroSessions, settings] = await Promise.all([
      prisma.task.findMany({
        where: { userId },
        include: {
          project: true,
          parentTask: true,
          subtasks: true,
        },
      }),
      prisma.project.findMany({
        where: { userId },
        include: {
          tasks: true,
        },
      }),
      prisma.pomodoroSession.findMany({
        where: { userId },
        include: {
          task: true,
        },
      }),
      prisma.userSettings.findUnique({
        where: { userId },
      }),
    ])

    const backup = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      userId,
      data: {
        tasks,
        projects,
        pomodoroSessions,
        settings,
      },
    }

    // バックアップをデータベースに保存
    const backupRecord = await prisma.backup.create({
      data: {
        userId,
        data: JSON.stringify(backup),
        size: JSON.stringify(backup).length,
      },
    })

    return {
      success: true,
      backup: {
        id: backupRecord.id,
        createdAt: backupRecord.createdAt,
        size: backupRecord.size,
      },
      downloadData: JSON.stringify(backup, null, 2),
    }
  } catch (error) {
    console.error('Backup creation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'バックアップの作成に失敗しました',
    }
  }
}

// バックアップからの復元
export async function restoreFromBackup(formData: FormData) {
  try {
    const userId = await checkAuth()
    const backupData = formData.get('backupData') as string

    if (!backupData) {
      throw new Error('バックアップデータが提供されていません')
    }

    const backup = JSON.parse(backupData)

    // バックアップデータの検証
    if (!backup.data || backup.userId !== userId) {
      throw new Error('無効なバックアップデータです')
    }

    await prisma.$transaction(async (tx) => {
      // 既存データを削除
      await tx.pomodoroSession.deleteMany({ where: { userId } })
      await tx.task.deleteMany({ where: { userId } })
      await tx.project.deleteMany({ where: { userId } })

      // バックアップデータを復元
      if (backup.data.projects?.length > 0) {
        for (const project of backup.data.projects) {
          const { tasks, ...projectData } = project
          await tx.project.create({
            data: {
              ...projectData,
              userId,
            },
          })
        }
      }

      if (backup.data.tasks?.length > 0) {
        for (const task of backup.data.tasks) {
          const { project, parentTask, subtasks, ...taskData } = task
          await tx.task.create({
            data: {
              ...taskData,
              userId,
            },
          })
        }
      }

      if (backup.data.pomodoroSessions?.length > 0) {
        for (const session of backup.data.pomodoroSessions) {
          const { task, ...sessionData } = session
          await tx.pomodoroSession.create({
            data: {
              ...sessionData,
              userId,
            },
          })
        }
      }

      // 設定を復元
      if (backup.data.settings) {
        await tx.userSettings.upsert({
          where: { userId },
          update: backup.data.settings,
          create: {
            ...backup.data.settings,
            userId,
          },
        })
      }
    })

    // 同期情報をリセット
    await prisma.userSyncInfo.deleteMany({
      where: { userId },
    })

    revalidatePath('/tasks')
    revalidatePath('/projects')
    revalidatePath('/timer')
    revalidatePath('/reports')

    return { success: true }
  } catch (error) {
    console.error('Backup restore error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'バックアップからの復元に失敗しました',
    }
  }
}
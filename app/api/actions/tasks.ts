'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { Task, Priority, Status as TaskStatus } from '@prisma/client'

// バリデーションスキーマ
const taskSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(200, 'タイトルは200文字以内で入力してください'),
  note: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  dueAt: z.string().transform(val => val ? new Date(val) : null).optional(),
  projectId: z.string().optional(),
  estimatePomos: z.number().min(1).default(1),
  order: z.number().default(0),
})

const updateTaskSchema = taskSchema.partial().extend({
  id: z.string(),
})

const bulkUpdateSchema = z.object({
  taskIds: z.array(z.string()),
  updates: z.object({
    status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    projectId: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
})

// 認証チェック関数
async function checkAuth() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect('/login')
  }
  return session.user.id
}

// タスク作成
export async function createTask(formData: FormData) {
  try {
    const userId = await checkAuth()

    const data = {
      title: formData.get('title') as string,
      description: formData.get('description') as string || undefined,
      priority: (formData.get('priority') as Priority) || 'MEDIUM',
      status: (formData.get('status') as TaskStatus) || 'TODO',
      dueDate: formData.get('dueDate') as string,
      projectId: formData.get('projectId') as string || undefined,
      parentTaskId: formData.get('parentTaskId') as string || undefined,
      tags: formData.get('tags') ? JSON.parse(formData.get('tags') as string) : [],
      estimatedTime: formData.get('estimatedTime') ? parseInt(formData.get('estimatedTime') as string) : undefined,
      position: formData.get('position') ? parseInt(formData.get('position') as string) : 0,
    }

    const validatedData = taskSchema.parse(data)

    // プロジェクトの存在確認（指定された場合）
    if (validatedData.projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: validatedData.projectId,
          userId,
        },
      })

      if (!project) {
        throw new Error('指定されたプロジェクトが見つかりません')
      }
    }

    // 親タスクの存在確認（指定された場合）
    if (validatedData.parentTaskId) {
      const parentTask = await prisma.task.findFirst({
        where: {
          id: validatedData.parentTaskId,
          userId,
        },
      })

      if (!parentTask) {
        throw new Error('指定された親タスクが見つかりません')
      }
    }

    const task = await prisma.task.create({
      data: {
        ...validatedData,
        userId,
        dueDate: validatedData.dueDate || undefined,
      },
      include: {
        project: true,
        parentTask: true,
        subtasks: true,
      },
    })

    revalidatePath('/tasks')
    return { success: true, task }
  } catch (error) {
    console.error('Task creation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'タスクの作成に失敗しました',
    }
  }
}

// タスク更新
export async function updateTask(formData: FormData) {
  try {
    const userId = await checkAuth()

    const data = {
      id: formData.get('id') as string,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      priority: formData.get('priority') as Priority,
      status: formData.get('status') as TaskStatus,
      dueDate: formData.get('dueDate') as string,
      projectId: formData.get('projectId') as string,
      parentTaskId: formData.get('parentTaskId') as string,
      tags: formData.get('tags') ? JSON.parse(formData.get('tags') as string) : undefined,
      estimatedTime: formData.get('estimatedTime') ? parseInt(formData.get('estimatedTime') as string) : undefined,
      position: formData.get('position') ? parseInt(formData.get('position') as string) : undefined,
    }

    const validatedData = updateTaskSchema.parse(data)

    // タスクの存在確認と所有者チェック
    const existingTask = await prisma.task.findFirst({
      where: {
        id: validatedData.id,
        userId,
      },
    })

    if (!existingTask) {
      throw new Error('タスクが見つかりません')
    }

    // プロジェクトの存在確認（変更された場合）
    if (validatedData.projectId && validatedData.projectId !== existingTask.projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: validatedData.projectId,
          userId,
        },
      })

      if (!project) {
        throw new Error('指定されたプロジェクトが見つかりません')
      }
    }

    const { id, ...updateData } = validatedData

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...updateData,
        dueDate: updateData.dueDate || undefined,
        projectId: updateData.projectId || null,
        parentTaskId: updateData.parentTaskId || null,
      },
      include: {
        project: true,
        parentTask: true,
        subtasks: true,
      },
    })

    revalidatePath('/tasks')
    revalidatePath(`/tasks/${id}`)
    return { success: true, task }
  } catch (error) {
    console.error('Task update error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'タスクの更新に失敗しました',
    }
  }
}

// タスク削除
export async function deleteTask(taskId: string) {
  try {
    const userId = await checkAuth()

    // タスクの存在確認と所有者チェック
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId,
      },
      include: {
        subtasks: true,
      },
    })

    if (!task) {
      throw new Error('タスクが見つかりません')
    }

    // サブタスクも一緒に削除
    await prisma.task.deleteMany({
      where: {
        parentTaskId: taskId,
      },
    })

    await prisma.task.delete({
      where: { id: taskId },
    })

    revalidatePath('/tasks')
    return { success: true }
  } catch (error) {
    console.error('Task deletion error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'タスクの削除に失敗しました',
    }
  }
}

// タスク一括更新
export async function bulkUpdateTasks(formData: FormData) {
  try {
    const userId = await checkAuth()

    const data = {
      taskIds: JSON.parse(formData.get('taskIds') as string),
      updates: JSON.parse(formData.get('updates') as string),
    }

    const validatedData = bulkUpdateSchema.parse(data)

    // 指定されたタスクがすべてユーザーに属するかチェック
    const tasks = await prisma.task.findMany({
      where: {
        id: { in: validatedData.taskIds },
        userId,
      },
    })

    if (tasks.length !== validatedData.taskIds.length) {
      throw new Error('一部のタスクが見つかりません')
    }

    // プロジェクトIDが指定されている場合の存在確認
    if (validatedData.updates.projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: validatedData.updates.projectId,
          userId,
        },
      })

      if (!project) {
        throw new Error('指定されたプロジェクトが見つかりません')
      }
    }

    await prisma.task.updateMany({
      where: {
        id: { in: validatedData.taskIds },
        userId,
      },
      data: {
        ...validatedData.updates,
        projectId: validatedData.updates.projectId || undefined,
      },
    })

    revalidatePath('/tasks')
    return { success: true }
  } catch (error) {
    console.error('Bulk task update error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'タスクの一括更新に失敗しました',
    }
  }
}

// タスク位置変更（ドラッグ&ドロップ用）
export async function reorderTasks(taskId: string, newPosition: number) {
  try {
    const userId = await checkAuth()

    // タスクの存在確認
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId,
      },
    })

    if (!task) {
      throw new Error('タスクが見つかりません')
    }

    // 同一プロジェクト内の他のタスクの位置を調整
    await prisma.$transaction(async (tx) => {
      // 新しい位置以降のタスクの位置を1つずつ後ろにずらす
      await tx.task.updateMany({
        where: {
          userId,
          projectId: task.projectId,
          position: { gte: newPosition },
          id: { not: taskId },
        },
        data: {
          position: { increment: 1 },
        },
      })

      // 対象タスクの位置を更新
      await tx.task.update({
        where: { id: taskId },
        data: { position: newPosition },
      })
    })

    revalidatePath('/tasks')
    return { success: true }
  } catch (error) {
    console.error('Task reorder error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'タスクの並び替えに失敗しました',
    }
  }
}

// タスク完了状態のトグル
export async function toggleTaskComplete(taskId: string) {
  try {
    const userId = await checkAuth()

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId,
      },
    })

    if (!task) {
      throw new Error('タスクが見つかりません')
    }

    const newStatus = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED'

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: newStatus,
        completedAt: newStatus === 'COMPLETED' ? new Date() : null,
      },
      include: {
        project: true,
        parentTask: true,
        subtasks: true,
      },
    })

    revalidatePath('/tasks')
    return { success: true, task: updatedTask }
  } catch (error) {
    console.error('Task toggle error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'タスクの状態変更に失敗しました',
    }
  }
}

// タスク複製
export async function duplicateTask(taskId: string) {
  try {
    const userId = await checkAuth()

    const originalTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId,
      },
      include: {
        subtasks: true,
      },
    })

    if (!originalTask) {
      throw new Error('タスクが見つかりません')
    }

    const { id, createdAt, updatedAt, completedAt, ...taskData } = originalTask

    const duplicatedTask = await prisma.task.create({
      data: {
        ...taskData,
        title: `${taskData.title} (コピー)`,
        status: 'TODO',
        completedAt: null,
        position: 0, // 最上位に配置
      },
      include: {
        project: true,
        parentTask: true,
        subtasks: true,
      },
    })

    // サブタスクも複製
    if (originalTask.subtasks.length > 0) {
      const subtaskPromises = originalTask.subtasks.map((subtask) => {
        const { id, createdAt, updatedAt, completedAt, parentTaskId, ...subtaskData } = subtask
        return prisma.task.create({
          data: {
            ...subtaskData,
            parentTaskId: duplicatedTask.id,
            status: 'TODO',
            completedAt: null,
          },
        })
      })

      await Promise.all(subtaskPromises)
    }

    revalidatePath('/tasks')
    return { success: true, task: duplicatedTask }
  } catch (error) {
    console.error('Task duplication error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'タスクの複製に失敗しました',
    }
  }
}

// 完了済みタスクのアーカイブ
export async function archiveCompletedTasks(projectId?: string) {
  try {
    const userId = await checkAuth()

    const whereClause: any = {
      userId,
      status: 'COMPLETED',
    }

    if (projectId) {
      whereClause.projectId = projectId
    }

    const result = await prisma.task.updateMany({
      where: whereClause,
      data: {
        archived: true,
      },
    })

    revalidatePath('/tasks')
    return { success: true, count: result.count }
  } catch (error) {
    console.error('Task archive error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'タスクのアーカイブに失敗しました',
    }
  }
}

// タスク検索
export async function searchTasks(query: string, filters?: {
  projectId?: string
  status?: TaskStatus
  priority?: Priority
}) {
  try {
    const userId = await checkAuth()

    const whereClause: any = {
      userId,
      archived: false,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    }

    if (filters?.projectId) {
      whereClause.projectId = filters.projectId
    }

    if (filters?.status) {
      whereClause.status = filters.status
    }

    if (filters?.priority) {
      whereClause.priority = filters.priority
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        project: true,
        parentTask: true,
        subtasks: true,
      },
      orderBy: [
        { position: 'asc' },
        { createdAt: 'desc' },
      ],
      take: 50, // 検索結果を50件に制限
    })

    return { success: true, tasks }
  } catch (error) {
    console.error('Task search error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'タスクの検索に失敗しました',
    }
  }
}
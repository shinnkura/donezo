'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { Project } from '@prisma/client'

// バリデーションスキーマ
const projectSchema = z.object({
  name: z.string().min(1, 'プロジェクト名は必須です').max(100, 'プロジェクト名は100文字以内で入力してください'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, '有効な色コードを入力してください').default('#3b82f6'),
  isActive: z.boolean().default(true),
  dueDate: z.string().transform(val => val ? new Date(val) : null).optional(),
  tags: z.array(z.string()).default([]),
  position: z.number().default(0),
})

const updateProjectSchema = projectSchema.partial().extend({
  id: z.string(),
})

// 認証チェック関数
async function checkAuth() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect('/login')
  }
  return session.user.id
}

// プロジェクト作成
export async function createProject(formData: FormData) {
  try {
    const userId = await checkAuth()

    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || undefined,
      color: formData.get('color') as string || '#3b82f6',
      isActive: formData.get('isActive') === 'true',
      dueDate: formData.get('dueDate') as string,
      tags: formData.get('tags') ? JSON.parse(formData.get('tags') as string) : [],
      position: formData.get('position') ? parseInt(formData.get('position') as string) : 0,
    }

    const validatedData = projectSchema.parse(data)

    // 同名のプロジェクトが存在しないかチェック
    const existingProject = await prisma.project.findFirst({
      where: {
        name: validatedData.name,
        userId,
      },
    })

    if (existingProject) {
      throw new Error('同名のプロジェクトが既に存在します')
    }

    const project = await prisma.project.create({
      data: {
        ...validatedData,
        userId,
        dueDate: validatedData.dueDate || undefined,
      },
      include: {
        tasks: {
          where: { archived: false },
          orderBy: { position: 'asc' },
        },
        _count: {
          select: {
            tasks: {
              where: { archived: false },
            },
          },
        },
      },
    })

    revalidatePath('/projects')
    revalidatePath('/tasks')
    return { success: true, project }
  } catch (error) {
    console.error('Project creation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'プロジェクトの作成に失敗しました',
    }
  }
}

// プロジェクト更新
export async function updateProject(formData: FormData) {
  try {
    const userId = await checkAuth()

    const data = {
      id: formData.get('id') as string,
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      color: formData.get('color') as string,
      isActive: formData.get('isActive') === 'true',
      dueDate: formData.get('dueDate') as string,
      tags: formData.get('tags') ? JSON.parse(formData.get('tags') as string) : undefined,
      position: formData.get('position') ? parseInt(formData.get('position') as string) : undefined,
    }

    const validatedData = updateProjectSchema.parse(data)

    // プロジェクトの存在確認と所有者チェック
    const existingProject = await prisma.project.findFirst({
      where: {
        id: validatedData.id,
        userId,
      },
    })

    if (!existingProject) {
      throw new Error('プロジェクトが見つかりません')
    }

    // 名前が変更される場合、同名チェック
    if (validatedData.name && validatedData.name !== existingProject.name) {
      const duplicateProject = await prisma.project.findFirst({
        where: {
          name: validatedData.name,
          userId,
          id: { not: validatedData.id },
        },
      })

      if (duplicateProject) {
        throw new Error('同名のプロジェクトが既に存在します')
      }
    }

    const { id, ...updateData } = validatedData

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...updateData,
        dueDate: updateData.dueDate || undefined,
      },
      include: {
        tasks: {
          where: { archived: false },
          orderBy: { position: 'asc' },
        },
        _count: {
          select: {
            tasks: {
              where: { archived: false },
            },
          },
        },
      },
    })

    revalidatePath('/projects')
    revalidatePath('/tasks')
    revalidatePath(`/projects/${id}`)
    return { success: true, project }
  } catch (error) {
    console.error('Project update error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'プロジェクトの更新に失敗しました',
    }
  }
}

// プロジェクト削除
export async function deleteProject(projectId: string, moveTasksToProjectId?: string) {
  try {
    const userId = await checkAuth()

    // プロジェクトの存在確認と所有者チェック
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
      include: {
        tasks: {
          where: { archived: false },
        },
      },
    })

    if (!project) {
      throw new Error('プロジェクトが見つかりません')
    }

    // 移動先プロジェクトの確認（指定された場合）
    if (moveTasksToProjectId) {
      const targetProject = await prisma.project.findFirst({
        where: {
          id: moveTasksToProjectId,
          userId,
        },
      })

      if (!targetProject) {
        throw new Error('移動先のプロジェクトが見つかりません')
      }
    }

    await prisma.$transaction(async (tx) => {
      // タスクの処理
      if (project.tasks.length > 0) {
        if (moveTasksToProjectId) {
          // 指定されたプロジェクトにタスクを移動
          await tx.task.updateMany({
            where: {
              projectId: projectId,
            },
            data: {
              projectId: moveTasksToProjectId,
            },
          })
        } else {
          // タスクをアーカイブ
          await tx.task.updateMany({
            where: {
              projectId: projectId,
            },
            data: {
              archived: true,
            },
          })
        }
      }

      // プロジェクトを削除
      await tx.project.delete({
        where: { id: projectId },
      })
    })

    revalidatePath('/projects')
    revalidatePath('/tasks')
    return { success: true }
  } catch (error) {
    console.error('Project deletion error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'プロジェクトの削除に失敗しました',
    }
  }
}

// プロジェクトアーカイブ
export async function archiveProject(projectId: string) {
  try {
    const userId = await checkAuth()

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    })

    if (!project) {
      throw new Error('プロジェクトが見つかりません')
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        isActive: false,
      },
      include: {
        tasks: {
          where: { archived: false },
          orderBy: { position: 'asc' },
        },
        _count: {
          select: {
            tasks: {
              where: { archived: false },
            },
          },
        },
      },
    })

    revalidatePath('/projects')
    return { success: true, project: updatedProject }
  } catch (error) {
    console.error('Project archive error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'プロジェクトのアーカイブに失敗しました',
    }
  }
}

// プロジェクト復元
export async function restoreProject(projectId: string) {
  try {
    const userId = await checkAuth()

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    })

    if (!project) {
      throw new Error('プロジェクトが見つかりません')
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        isActive: true,
      },
      include: {
        tasks: {
          where: { archived: false },
          orderBy: { position: 'asc' },
        },
        _count: {
          select: {
            tasks: {
              where: { archived: false },
            },
          },
        },
      },
    })

    revalidatePath('/projects')
    return { success: true, project: updatedProject }
  } catch (error) {
    console.error('Project restore error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'プロジェクトの復元に失敗しました',
    }
  }
}

// プロジェクト位置変更
export async function reorderProjects(projectId: string, newPosition: number) {
  try {
    const userId = await checkAuth()

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    })

    if (!project) {
      throw new Error('プロジェクトが見つかりません')
    }

    await prisma.$transaction(async (tx) => {
      // 新しい位置以降のプロジェクトの位置を1つずつ後ろにずらす
      await tx.project.updateMany({
        where: {
          userId,
          position: { gte: newPosition },
          id: { not: projectId },
        },
        data: {
          position: { increment: 1 },
        },
      })

      // 対象プロジェクトの位置を更新
      await tx.project.update({
        where: { id: projectId },
        data: { position: newPosition },
      })
    })

    revalidatePath('/projects')
    return { success: true }
  } catch (error) {
    console.error('Project reorder error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'プロジェクトの並び替えに失敗しました',
    }
  }
}

// プロジェクト複製
export async function duplicateProject(projectId: string, includeCompletedTasks: boolean = false) {
  try {
    const userId = await checkAuth()

    const originalProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
      include: {
        tasks: {
          where: {
            archived: false,
            ...(includeCompletedTasks ? {} : { status: { not: 'COMPLETED' } }),
          },
        },
      },
    })

    if (!originalProject) {
      throw new Error('プロジェクトが見つかりません')
    }

    const { id, createdAt, updatedAt, ...projectData } = originalProject

    const duplicatedProject = await prisma.project.create({
      data: {
        ...projectData,
        name: `${projectData.name} (コピー)`,
        position: 0, // 最上位に配置
      },
    })

    // タスクも複製
    if (originalProject.tasks.length > 0) {
      const taskPromises = originalProject.tasks.map((task, index) => {
        const { id, createdAt, updatedAt, completedAt, projectId, ...taskData } = task
        return prisma.task.create({
          data: {
            ...taskData,
            projectId: duplicatedProject.id,
            status: includeCompletedTasks ? taskData.status : 'TODO',
            completedAt: includeCompletedTasks ? completedAt : null,
            position: index,
          },
        })
      })

      await Promise.all(taskPromises)
    }

    const projectWithTasks = await prisma.project.findUnique({
      where: { id: duplicatedProject.id },
      include: {
        tasks: {
          where: { archived: false },
          orderBy: { position: 'asc' },
        },
        _count: {
          select: {
            tasks: {
              where: { archived: false },
            },
          },
        },
      },
    })

    revalidatePath('/projects')
    return { success: true, project: projectWithTasks }
  } catch (error) {
    console.error('Project duplication error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'プロジェクトの複製に失敗しました',
    }
  }
}

// プロジェクト統計情報取得
export async function getProjectStats(projectId: string) {
  try {
    const userId = await checkAuth()

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    })

    if (!project) {
      throw new Error('プロジェクトが見つかりません')
    }

    const stats = await prisma.task.groupBy({
      by: ['status', 'priority'],
      where: {
        projectId: projectId,
        archived: false,
      },
      _count: {
        id: true,
      },
    })

    const totalTasks = await prisma.task.count({
      where: {
        projectId: projectId,
        archived: false,
      },
    })

    const completedTasks = await prisma.task.count({
      where: {
        projectId: projectId,
        status: 'COMPLETED',
        archived: false,
      },
    })

    const overdueTasks = await prisma.task.count({
      where: {
        projectId: projectId,
        dueDate: {
          lt: new Date(),
        },
        status: {
          not: 'COMPLETED',
        },
        archived: false,
      },
    })

    const avgEstimatedTime = await prisma.task.aggregate({
      where: {
        projectId: projectId,
        estimatedTime: {
          not: null,
        },
        archived: false,
      },
      _avg: {
        estimatedTime: true,
      },
    })

    return {
      success: true,
      stats: {
        totalTasks,
        completedTasks,
        completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        overdueTasks,
        averageEstimatedTime: avgEstimatedTime._avg.estimatedTime || 0,
        statusBreakdown: stats.reduce((acc, item) => {
          if (!acc[item.status]) {
            acc[item.status] = 0
          }
          acc[item.status] += item._count.id
          return acc
        }, {} as Record<string, number>),
        priorityBreakdown: stats.reduce((acc, item) => {
          if (!acc[item.priority]) {
            acc[item.priority] = 0
          }
          acc[item.priority] += item._count.id
          return acc
        }, {} as Record<string, number>),
      },
    }
  } catch (error) {
    console.error('Project stats error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'プロジェクト統計情報の取得に失敗しました',
    }
  }
}

// プロジェクト検索
export async function searchProjects(query: string, includeInactive: boolean = false) {
  try {
    const userId = await checkAuth()

    const whereClause: any = {
      userId,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    }

    if (!includeInactive) {
      whereClause.isActive = true
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        tasks: {
          where: { archived: false },
          orderBy: { position: 'asc' },
          take: 5, // 各プロジェクトにつき最大5個のタスクを表示
        },
        _count: {
          select: {
            tasks: {
              where: { archived: false },
            },
          },
        },
      },
      orderBy: [
        { position: 'asc' },
        { createdAt: 'desc' },
      ],
      take: 20, // 検索結果を20件に制限
    })

    return { success: true, projects }
  } catch (error) {
    console.error('Project search error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'プロジェクトの検索に失敗しました',
    }
  }
}

// プロジェクトのタスク完了率更新
export async function updateProjectProgress(projectId: string) {
  try {
    const userId = await checkAuth()

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    })

    if (!project) {
      throw new Error('プロジェクトが見つかりません')
    }

    const totalTasks = await prisma.task.count({
      where: {
        projectId: projectId,
        archived: false,
      },
    })

    const completedTasks = await prisma.task.count({
      where: {
        projectId: projectId,
        status: 'COMPLETED',
        archived: false,
      },
    })

    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        progress,
      },
    })

    return { success: true, progress }
  } catch (error) {
    console.error('Project progress update error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'プロジェクト進捗の更新に失敗しました',
    }
  }
}
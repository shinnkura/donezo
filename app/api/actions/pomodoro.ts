'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

// バリデーションスキーマ
const pomodoroSessionSchema = z.object({
  type: z.enum(['pomodoro', 'short_break', 'long_break', 'custom']),
  duration: z.number().min(1, '期間は1秒以上である必要があります'),
  startTime: z.string().transform(val => new Date(val)),
  endTime: z.string().transform(val => val ? new Date(val) : null).optional(),
  taskId: z.string().optional(),
  completed: z.boolean().default(false),
  paused: z.boolean().default(false),
  pausedDuration: z.number().default(0),
  actualDuration: z.number().optional(),
  notes: z.string().optional(),
})

const updateSessionSchema = pomodoroSessionSchema.partial().extend({
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

// ポモドーロセッション開始
export async function startPomodoroSession(formData: FormData) {
  try {
    const userId = await checkAuth()

    const data = {
      type: formData.get('type') as string,
      duration: parseInt(formData.get('duration') as string),
      startTime: formData.get('startTime') as string || new Date().toISOString(),
      taskId: formData.get('taskId') as string || undefined,
      notes: formData.get('notes') as string || undefined,
    }

    const validatedData = pomodoroSessionSchema.parse(data)

    // タスクの存在確認（指定された場合）
    if (validatedData.taskId) {
      const task = await prisma.task.findFirst({
        where: {
          id: validatedData.taskId,
          userId,
        },
      })

      if (!task) {
        throw new Error('指定されたタスクが見つかりません')
      }
    }

    // 既に進行中のセッションがないかチェック
    const activeSession = await prisma.pomodoroSession.findFirst({
      where: {
        userId,
        endTime: null,
      },
    })

    if (activeSession) {
      throw new Error('既に進行中のセッションがあります')
    }

    const session = await prisma.pomodoroSession.create({
      data: {
        ...validatedData,
        userId,
        endTime: undefined,
      },
      include: {
        task: true,
      },
    })

    revalidatePath('/timer')
    revalidatePath('/reports')
    return { success: true, session }
  } catch (error) {
    console.error('Pomodoro session start error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'ポモドーロセッションの開始に失敗しました',
    }
  }
}

// ポモドーロセッション完了
export async function completePomodoroSession(sessionId: string, actualDuration?: number) {
  try {
    const userId = await checkAuth()

    const session = await prisma.pomodoroSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    })

    if (!session) {
      throw new Error('セッションが見つかりません')
    }

    if (session.endTime) {
      throw new Error('このセッションは既に完了しています')
    }

    const endTime = new Date()
    const calculatedDuration = actualDuration || Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000)

    const updatedSession = await prisma.pomodoroSession.update({
      where: { id: sessionId },
      data: {
        endTime,
        completed: true,
        actualDuration: calculatedDuration,
      },
      include: {
        task: true,
      },
    })

    // タスクがフォーカスセッションの場合、タスクの進捗を更新
    if (session.type === 'pomodoro' && session.taskId) {
      await prisma.task.update({
        where: { id: session.taskId },
        data: {
          actualTime: {
            increment: calculatedDuration,
          },
        },
      })
    }

    revalidatePath('/timer')
    revalidatePath('/reports')
    revalidatePath('/tasks')
    return { success: true, session: updatedSession }
  } catch (error) {
    console.error('Pomodoro session completion error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'ポモドーロセッションの完了に失敗しました',
    }
  }
}

// ポモドーロセッション停止
export async function stopPomodoroSession(sessionId: string, reason?: string) {
  try {
    const userId = await checkAuth()

    const session = await prisma.pomodoroSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    })

    if (!session) {
      throw new Error('セッションが見つかりません')
    }

    if (session.endTime) {
      throw new Error('このセッションは既に終了しています')
    }

    const endTime = new Date()
    const actualDuration = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000) - (session.pausedDuration || 0)

    const updatedSession = await prisma.pomodoroSession.update({
      where: { id: sessionId },
      data: {
        endTime,
        completed: false,
        actualDuration,
        notes: reason ? `${session.notes || ''}\n停止理由: ${reason}`.trim() : session.notes,
      },
      include: {
        task: true,
      },
    })

    revalidatePath('/timer')
    revalidatePath('/reports')
    return { success: true, session: updatedSession }
  } catch (error) {
    console.error('Pomodoro session stop error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'ポモドーロセッションの停止に失敗しました',
    }
  }
}

// ポモドーロセッション一時停止
export async function pausePomodoroSession(sessionId: string) {
  try {
    const userId = await checkAuth()

    const session = await prisma.pomodoroSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    })

    if (!session) {
      throw new Error('セッションが見つかりません')
    }

    if (session.endTime) {
      throw new Error('このセッションは既に終了しています')
    }

    if (session.paused) {
      throw new Error('このセッションは既に一時停止中です')
    }

    const updatedSession = await prisma.pomodoroSession.update({
      where: { id: sessionId },
      data: {
        paused: true,
        pauseStartTime: new Date(),
      },
      include: {
        task: true,
      },
    })

    revalidatePath('/timer')
    return { success: true, session: updatedSession }
  } catch (error) {
    console.error('Pomodoro session pause error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'ポモドーロセッションの一時停止に失敗しました',
    }
  }
}

// ポモドーロセッション再開
export async function resumePomodoroSession(sessionId: string) {
  try {
    const userId = await checkAuth()

    const session = await prisma.pomodoroSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    })

    if (!session) {
      throw new Error('セッションが見つかりません')
    }

    if (!session.paused || !session.pauseStartTime) {
      throw new Error('このセッションは一時停止中ではありません')
    }

    const pauseDuration = Math.floor((new Date().getTime() - session.pauseStartTime.getTime()) / 1000)

    const updatedSession = await prisma.pomodoroSession.update({
      where: { id: sessionId },
      data: {
        paused: false,
        pauseStartTime: null,
        pausedDuration: (session.pausedDuration || 0) + pauseDuration,
      },
      include: {
        task: true,
      },
    })

    revalidatePath('/timer')
    return { success: true, session: updatedSession }
  } catch (error) {
    console.error('Pomodoro session resume error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'ポモドーロセッションの再開に失敗しました',
    }
  }
}

// ポモドーロセッション更新
export async function updatePomodoroSession(formData: FormData) {
  try {
    const userId = await checkAuth()

    const data = {
      id: formData.get('id') as string,
      type: formData.get('type') as string,
      duration: formData.get('duration') ? parseInt(formData.get('duration') as string) : undefined,
      startTime: formData.get('startTime') as string,
      endTime: formData.get('endTime') as string,
      taskId: formData.get('taskId') as string,
      completed: formData.get('completed') === 'true',
      notes: formData.get('notes') as string,
    }

    const validatedData = updateSessionSchema.parse(data)

    // セッションの存在確認と所有者チェック
    const existingSession = await prisma.pomodoroSession.findFirst({
      where: {
        id: validatedData.id,
        userId,
      },
    })

    if (!existingSession) {
      throw new Error('セッションが見つかりません')
    }

    // タスクの存在確認（変更された場合）
    if (validatedData.taskId && validatedData.taskId !== existingSession.taskId) {
      const task = await prisma.task.findFirst({
        where: {
          id: validatedData.taskId,
          userId,
        },
      })

      if (!task) {
        throw new Error('指定されたタスクが見つかりません')
      }
    }

    const { id, ...updateData } = validatedData

    const session = await prisma.pomodoroSession.update({
      where: { id },
      data: {
        ...updateData,
        taskId: updateData.taskId || null,
      },
      include: {
        task: true,
      },
    })

    revalidatePath('/timer')
    revalidatePath('/reports')
    return { success: true, session }
  } catch (error) {
    console.error('Pomodoro session update error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'ポモドーロセッションの更新に失敗しました',
    }
  }
}

// ポモドーロセッション削除
export async function deletePomodoroSession(sessionId: string) {
  try {
    const userId = await checkAuth()

    const session = await prisma.pomodoroSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    })

    if (!session) {
      throw new Error('セッションが見つかりません')
    }

    await prisma.pomodoroSession.delete({
      where: { id: sessionId },
    })

    revalidatePath('/timer')
    revalidatePath('/reports')
    return { success: true }
  } catch (error) {
    console.error('Pomodoro session deletion error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'ポモドーロセッションの削除に失敗しました',
    }
  }
}

// アクティブセッション取得
export async function getActiveSession() {
  try {
    const userId = await checkAuth()

    const activeSession = await prisma.pomodoroSession.findFirst({
      where: {
        userId,
        endTime: null,
      },
      include: {
        task: true,
      },
    })

    return { success: true, session: activeSession }
  } catch (error) {
    console.error('Active session fetch error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'アクティブセッションの取得に失敗しました',
    }
  }
}

// ポモドーロ統計情報取得
export async function getPomodoroStats(period: 'today' | 'week' | 'month' | 'all' = 'today') {
  try {
    const userId = await checkAuth()

    let startDate: Date
    let endDate: Date

    const now = new Date()

    switch (period) {
      case 'today':
        startDate = startOfDay(now)
        endDate = endOfDay(now)
        break
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 }) // Monday
        endDate = endOfWeek(now, { weekStartsOn: 1 })
        break
      case 'month':
        startDate = startOfMonth(now)
        endDate = endOfMonth(now)
        break
      case 'all':
        startDate = new Date(0) // Unix epoch
        endDate = now
        break
    }

    const whereClause: any = {
      userId,
      startTime: {
        gte: startDate,
        lte: endDate,
      },
    }

    // 基本統計
    const totalSessions = await prisma.pomodoroSession.count({
      where: whereClause,
    })

    const completedSessions = await prisma.pomodoroSession.count({
      where: {
        ...whereClause,
        completed: true,
      },
    })

    const focusSessions = await prisma.pomodoroSession.count({
      where: {
        ...whereClause,
        type: 'pomodoro',
        completed: true,
      },
    })

    const totalFocusTime = await prisma.pomodoroSession.aggregate({
      where: {
        ...whereClause,
        type: 'pomodoro',
        completed: true,
      },
      _sum: {
        actualDuration: true,
      },
    })

    const totalBreakTime = await prisma.pomodoroSession.aggregate({
      where: {
        ...whereClause,
        type: { in: ['short_break', 'long_break'] },
        completed: true,
      },
      _sum: {
        actualDuration: true,
      },
    })

    // セッション種別ごとの統計
    const sessionsByType = await prisma.pomodoroSession.groupBy({
      by: ['type'],
      where: {
        ...whereClause,
        completed: true,
      },
      _count: {
        id: true,
      },
      _sum: {
        actualDuration: true,
      },
    })

    // 最長連続セッション数
    const allSessions = await prisma.pomodoroSession.findMany({
      where: {
        userId,
        type: 'pomodoro',
        completed: true,
      },
      orderBy: {
        startTime: 'desc',
      },
      select: {
        startTime: true,
        completed: true,
      },
    })

    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0

    // 連続セッションの計算（日ベース）
    const sessionDates = allSessions.map(s => startOfDay(s.startTime).getTime())
    const uniqueDates = [...new Set(sessionDates)].sort((a, b) => b - a)

    for (let i = 0; i < uniqueDates.length; i++) {
      const currentDate = uniqueDates[i]
      const previousDate = i > 0 ? uniqueDates[i - 1] : null

      if (!previousDate || currentDate === previousDate - 24 * 60 * 60 * 1000) {
        tempStreak++
        if (i === 0) currentStreak = tempStreak
      } else {
        longestStreak = Math.max(longestStreak, tempStreak)
        tempStreak = 1
        if (i === 0) currentStreak = 1
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak)

    return {
      success: true,
      stats: {
        totalSessions,
        completedSessions,
        completionRate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
        focusSessions,
        totalFocusTime: totalFocusTime._sum.actualDuration || 0,
        totalBreakTime: totalBreakTime._sum.actualDuration || 0,
        averageSessionLength: completedSessions > 0
          ? ((totalFocusTime._sum.actualDuration || 0) + (totalBreakTime._sum.actualDuration || 0)) / completedSessions
          : 0,
        currentStreak,
        longestStreak,
        sessionsByType: sessionsByType.reduce((acc, item) => {
          acc[item.type] = {
            count: item._count.id,
            totalTime: item._sum.actualDuration || 0,
          }
          return acc
        }, {} as Record<string, { count: number; totalTime: number }>),
      },
    }
  } catch (error) {
    console.error('Pomodoro stats error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'ポモドーロ統計情報の取得に失敗しました',
    }
  }
}

// 日別セッション履歴取得
export async function getDailySessionHistory(days: number = 30) {
  try {
    const userId = await checkAuth()

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const sessions = await prisma.pomodoroSession.findMany({
      where: {
        userId,
        startTime: {
          gte: startDate,
        },
        completed: true,
      },
      select: {
        startTime: true,
        type: true,
        actualDuration: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    // 日別にグループ化
    const dailyData = sessions.reduce((acc, session) => {
      const date = startOfDay(session.startTime).toISOString().split('T')[0]

      if (!acc[date]) {
        acc[date] = {
          date,
          focusSessions: 0,
          breakSessions: 0,
          totalFocusTime: 0,
          totalBreakTime: 0,
        }
      }

      if (session.type === 'pomodoro') {
        acc[date].focusSessions++
        acc[date].totalFocusTime += session.actualDuration || 0
      } else {
        acc[date].breakSessions++
        acc[date].totalBreakTime += session.actualDuration || 0
      }

      return acc
    }, {} as Record<string, any>)

    return {
      success: true,
      history: Object.values(dailyData),
    }
  } catch (error) {
    console.error('Daily session history error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '日別セッション履歴の取得に失敗しました',
    }
  }
}

// タスク別セッション統計
export async function getTaskSessionStats() {
  try {
    const userId = await checkAuth()

    const taskStats = await prisma.pomodoroSession.groupBy({
      by: ['taskId'],
      where: {
        userId,
        type: 'pomodoro',
        completed: true,
        taskId: {
          not: null,
        },
      },
      _count: {
        id: true,
      },
      _sum: {
        actualDuration: true,
      },
    })

    // タスク情報を取得
    const taskIds = taskStats.map(stat => stat.taskId).filter(Boolean) as string[]
    const tasks = await prisma.task.findMany({
      where: {
        id: { in: taskIds },
        userId,
      },
      select: {
        id: true,
        title: true,
        project: {
          select: {
            name: true,
            color: true,
          },
        },
      },
    })

    const taskMap = tasks.reduce((acc, task) => {
      acc[task.id] = task
      return acc
    }, {} as Record<string, any>)

    const enrichedStats = taskStats
      .filter(stat => stat.taskId && taskMap[stat.taskId])
      .map(stat => ({
        task: taskMap[stat.taskId!],
        sessionCount: stat._count.id,
        totalTime: stat._sum.actualDuration || 0,
      }))
      .sort((a, b) => b.totalTime - a.totalTime)

    return {
      success: true,
      taskStats: enrichedStats,
    }
  } catch (error) {
    console.error('Task session stats error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'タスク別セッション統計の取得に失敗しました',
    }
  }
}
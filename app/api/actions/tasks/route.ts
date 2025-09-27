import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'getTasks': {
        const tasks = await prisma.task.findMany({
          where: {
            userId: session.user.id,
          },
          include: {
            project: true,
          },
          orderBy: [
            { createdAt: 'desc' }
          ],
        })

        return NextResponse.json({ tasks })
      }

      case 'createTask': {
        const { title, note, priority, projectId, estimatePomos, dueAt } = body

        const task = await prisma.task.create({
          data: {
            title,
            note: note || null,
            priority: priority || 'MEDIUM',
            projectId: projectId || null,
            estimatePomos: estimatePomos || 1,
            dueAt: dueAt ? new Date(dueAt) : null,
            userId: session.user.id,
            completedPomos: 0,
            isDone: false,
          },
          include: {
            project: true,
          },
        })

        return NextResponse.json({ task })
      }

      case 'toggleTaskDone': {
        const { taskId } = body

        const task = await prisma.task.findFirst({
          where: {
            id: taskId,
            userId: session.user.id,
          },
        })

        if (!task) {
          return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }

        const updatedTask = await prisma.task.update({
          where: { id: taskId },
          data: {
            isDone: !task.isDone,
          },
          include: {
            project: true,
          },
        })

        return NextResponse.json({ task: updatedTask })
      }

      case 'deleteTask': {
        const { taskId } = body

        const task = await prisma.task.findFirst({
          where: {
            id: taskId,
            userId: session.user.id,
          },
        })

        if (!task) {
          return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }

        await prisma.task.delete({
          where: { id: taskId },
        })

        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Task API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
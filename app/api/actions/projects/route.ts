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
      case 'getProjects': {
        const projects = await prisma.project.findMany({
          where: {
            userId: session.user.id,
          },
          orderBy: [
            { createdAt: 'desc' }
          ],
        })

        return NextResponse.json({ projects })
      }

      case 'createProject': {
        const { name, color } = body

        const project = await prisma.project.create({
          data: {
            name,
            color: color || '#000000',
            userId: session.user.id,
          },
        })

        return NextResponse.json({ project })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Project API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
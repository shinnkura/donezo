import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.password) {
      return NextResponse.json({ error: 'User has no password' }, { status: 400 })
    }

    const passwordMatch = await bcrypt.compare(password, user.password)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      passwordMatch,
      passwordHash: user.password,
      providedPassword: password,
    })
  } catch (error) {
    return NextResponse.json({ error: error }, { status: 500 })
  }
}
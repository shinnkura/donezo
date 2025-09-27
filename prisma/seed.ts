import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Create demo user
  const hashedPassword = await bcrypt.hash('demo123', 10)
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
      password: hashedPassword,
      emailVerified: new Date(),
    },
  })

  console.log('👤 Created demo user:', demoUser.email)

  // Create projects
  const personalProject = await prisma.project.upsert({
    where: { id: 'personal-project-id' },
    update: {},
    create: {
      id: 'personal-project-id',
      userId: demoUser.id,
      name: '個人プロジェクト',
      color: '#3b82f6',
      order: 0,
    },
  })

  const workProject = await prisma.project.upsert({
    where: { id: 'work-project-id' },
    update: {},
    create: {
      id: 'work-project-id',
      userId: demoUser.id,
      name: '仕事',
      color: '#10b981',
      order: 1,
    },
  })

  console.log('📁 Created projects')

  // Create sample tasks
  const tasks = [
    {
      title: 'アプリのセットアップ',
      projectId: personalProject.id,
      priority: 'HIGH' as const,
      estimatePomos: 2,
      note: 'ポモドーロタイマーアプリの初期設定を行う',
    },
    {
      title: 'ドキュメント作成',
      projectId: workProject.id,
      priority: 'MEDIUM' as const,
      estimatePomos: 4,
      dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    },
    {
      title: '週次レポート',
      projectId: workProject.id,
      priority: 'HIGH' as const,
      estimatePomos: 1,
      dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      repeatRule: 'FREQ=WEEKLY;BYDAY=FR',
    },
  ]

  for (const taskData of tasks) {
    const task = await prisma.task.create({
      data: {
        ...taskData,
        userId: demoUser.id,
      },
    })

    // Add subtasks for the first task
    if (taskData.title === 'アプリのセットアップ') {
      await prisma.subtask.createMany({
        data: [
          { taskId: task.id, title: 'データベース接続', order: 0 },
          { taskId: task.id, title: '認証システム実装', order: 1 },
          { taskId: task.id, title: 'UIコンポーネント作成', order: 2 },
        ],
      })
    }
  }

  console.log('✅ Created sample tasks')

  // Create a sample device
  const device = await prisma.device.create({
    data: {
      userId: demoUser.id,
      name: 'Demo Browser',
      platform: 'web',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    },
  })

  // Create sample pomodoro sessions
  const now = new Date()
  const sessions = [
    {
      userId: demoUser.id,
      kind: 'FOCUS' as const,
      startedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      endedAt: new Date(now.getTime() - 1.5 * 60 * 60 * 1000),
      durationSec: 1500,
      deviceId: device.id,
      isCompleted: true,
    },
    {
      userId: demoUser.id,
      kind: 'SHORT_BREAK' as const,
      startedAt: new Date(now.getTime() - 1.5 * 60 * 60 * 1000),
      endedAt: new Date(now.getTime() - 1.4 * 60 * 60 * 1000),
      durationSec: 300,
      deviceId: device.id,
      isCompleted: true,
    },
  ]

  for (const sessionData of sessions) {
    await prisma.pomodoroSession.create({
      data: sessionData,
    })
  }

  console.log('⏱️  Created sample pomodoro sessions')
  console.log('✨ Seed completed successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
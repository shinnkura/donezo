const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testLogin() {
  try {
    console.log('Testing login for demo@example.com...')

    const user = await prisma.user.findUnique({
      where: { email: 'demo@example.com' }
    })

    if (!user) {
      console.log('User not found')
      return
    }

    console.log('User found:', {
      id: user.id,
      email: user.email,
      name: user.name,
      hasPassword: !!user.password
    })

    const testPassword = 'demo123'
    const passwordMatch = await bcrypt.compare(testPassword, user.password)
    console.log('Password match:', passwordMatch)

    // 新しいハッシュを生成してみる
    const newHash = await bcrypt.hash(testPassword, 10)
    console.log('New hash:', newHash)

    // 新しいハッシュで検証
    const newHashMatch = await bcrypt.compare(testPassword, newHash)
    console.log('New hash match:', newHashMatch)

    // パスワードを更新
    if (!passwordMatch) {
      console.log('Updating password...')
      await prisma.user.update({
        where: { email: 'demo@example.com' },
        data: { password: newHash }
      })
      console.log('Password updated')
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testLogin()
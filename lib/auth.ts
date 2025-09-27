import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('無効なメールアドレスです'),
  password: z.string().min(6, 'パスワードは6文字以上である必要があります'),
})

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/login',
    signOut: '/auth/logout',
    error: '/auth/error',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'メールアドレス', type: 'email' },
        password: { label: 'パスワード', type: 'password' },
      },
      async authorize(credentials) {
        try {
          console.log('Auth attempt for:', credentials?.email)

          if (!credentials?.email || !credentials?.password) {
            throw new Error('メールアドレスとパスワードが必要です')
          }

          const validation = loginSchema.safeParse(credentials)
          if (!validation.success) {
            throw new Error(validation.error.errors[0].message)
          }

          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          })

          console.log('User found:', !!user)

          if (!user || !user.password) {
            throw new Error('メールアドレスまたはパスワードが正しくありません')
          }

          const passwordMatch = await bcrypt.compare(
            credentials.password,
            user.password
          )

          console.log('Password match:', passwordMatch)

          if (!passwordMatch) {
            throw new Error('メールアドレスまたはパスワードが正しくありません')
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          }
        } catch (error) {
          console.error('Auth error:', error)
          throw error
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.image = user.image
      }
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.image as string
      }
      return session
    },
  },
  debug: process.env.NODE_ENV === 'development',
}
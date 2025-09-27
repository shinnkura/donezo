'use client'

import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { LogOut, User } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { GlobalTimer } from './GlobalTimer'

export function Header() {
  const { data: session } = useSession()

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' })
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center space-x-4">
        <h2 className="text-lg font-semibold text-foreground">
          おかえりなさい、{session?.user?.name || 'ユーザー'}さん
        </h2>
      </div>

      <div className="flex items-center space-x-4">
        <GlobalTimer />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={session?.user?.image || ''} alt="プロフィール画像" />
                <AvatarFallback>
                  {session?.user?.name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="end">
            <div className="flex items-center space-x-2 p-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={session?.user?.image || ''} alt="プロフィール画像" />
                <AvatarFallback>
                  {session?.user?.name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">
                  {session?.user?.name || 'ユーザー'}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {session?.user?.email}
                </p>
              </div>
            </div>
            <Separator className="my-2" />
            <div className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                ログアウト
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  )
}
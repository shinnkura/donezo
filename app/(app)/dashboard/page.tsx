'use client'

import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { CheckSquare, Timer, TrendingUp, Plus } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { data: session } = useSession()

  // TODO: 実際のデータに置き換える
  const stats = {
    totalTasks: 12,
    completedTasks: 8,
    todayTasks: 5,
    pomodoroSessions: 6,
  }

  const completionRate = (stats.completedTasks / stats.totalTasks) * 100

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">ダッシュボード</h1>
          <p className="text-muted-foreground">
            今日も一日お疲れ様でした、{session?.user?.name}さん
          </p>
        </div>
        <Link href="/tasks">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新しいタスク
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総タスク数</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
            <p className="text-xs text-muted-foreground">全体のタスク</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">完了タスク</CardTitle>
            <CheckSquare className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedTasks}</div>
            <p className="text-xs text-muted-foreground">完了済み</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日のタスク</CardTitle>
            <Timer className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayTasks}</div>
            <p className="text-xs text-muted-foreground">本日予定</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ポモドーロ</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pomodoroSessions}</div>
            <p className="text-xs text-muted-foreground">本日のセッション</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>タスク進捗</CardTitle>
            <CardDescription>
              全体のタスク完了率
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={completionRate} className="w-full" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {stats.completedTasks}/{stats.totalTasks} 完了
              </span>
              <span className="font-medium">{Math.round(completionRate)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近のアクティビティ</CardTitle>
            <CardDescription>
              直近の活動履歴
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-sm">「プレゼン資料作成」を完了しました</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                <span className="text-sm">ポモドーロタイマーを開始しました</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                <span className="text-sm">「会議資料レビュー」を追加しました</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>今日のタスク</CardTitle>
            <CardDescription>
              本日予定されているタスク
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">メール返信</span>
                <Button variant="outline" size="sm">
                  開始
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">週次レポート作成</span>
                <Button variant="outline" size="sm">
                  開始
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">チーム会議準備</span>
                <Button variant="outline" size="sm">
                  開始
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>クイックアクション</CardTitle>
            <CardDescription>
              よく使う機能への素早いアクセス
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/tasks">
              <Button variant="outline" className="w-full justify-start">
                <CheckSquare className="mr-2 h-4 w-4" />
                タスク管理
              </Button>
            </Link>
            <Link href="/timer">
              <Button variant="outline" className="w-full justify-start">
                <Timer className="mr-2 h-4 w-4" />
                ポモドーロタイマー
              </Button>
            </Link>
            <Link href="/reports">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="mr-2 h-4 w-4" />
                レポート表示
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
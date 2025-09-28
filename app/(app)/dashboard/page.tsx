'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { FolderOpen, CheckSquare, Timer, TrendingUp, Plus, Calendar } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Project {
  id: string
  name: string
  color: string
  taskCount?: number
  completedCount?: number
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    // デモデータ
    setProjects([
      { id: 'work', name: 'WORK', color: '#3B82F6', taskCount: 21, completedCount: 12 },
      { id: 'study', name: 'STUDY', color: '#10B981', taskCount: 11, completedCount: 7 },
      { id: 'develop', name: 'DEVELOP', color: '#8B5CF6', taskCount: 8, completedCount: 3 },
    ])
  }, [])

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
          <h1 className="text-3xl font-bold text-foreground">オーバービュー</h1>
          <p className="text-muted-foreground">
            こんにちは、{session?.user?.name}さん
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          新しいプロジェクト
        </Button>
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

      {/* プロジェクト一覧 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">プロジェクト</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {projects.map((project) => {
            const projectCompletionRate = project.taskCount
              ? (project.completedCount! / project.taskCount) * 100
              : 0

            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: project.color + "20" }}
                        >
                          <FolderOpen className="h-4 w-4" style={{ color: project.color }} />
                        </div>
                        <CardTitle className="text-base">{project.name}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Progress value={projectCompletionRate} className="h-2 mb-2" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {project.completedCount}/{project.taskCount} タスク
                      </span>
                      <span className="font-medium">{Math.round(projectCompletionRate)}%</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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

        <Card>
          <CardHeader>
            <CardTitle>今日のフォーカス</CardTitle>
            <CardDescription>
              本日予定されているタスク
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-sm">メール返信</span>
                </div>
                <span className="text-xs text-muted-foreground">WORK</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm">週次レポート作成</span>
                </div>
                <span className="text-xs text-muted-foreground">STUDY</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span className="text-sm">チーム会議準備</span>
                </div>
                <span className="text-xs text-muted-foreground">DEVELOP</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>クイックアクション</CardTitle>
            <CardDescription>
              よく使う機能への素早いアクセス
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/today">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="mr-2 h-4 w-4" />
                今日のタスク
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

        <Card>
          <CardHeader>
            <CardTitle>進捗サマリー</CardTitle>
            <CardDescription>
              全プロジェクトの進捗状況
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">WORK</span>
                <span className="text-sm text-muted-foreground">57%</span>
              </div>
              <Progress value={57} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">STUDY</span>
                <span className="text-sm text-muted-foreground">64%</span>
              </div>
              <Progress value={64} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">DEVELOP</span>
                <span className="text-sm text-muted-foreground">38%</span>
              </div>
              <Progress value={38} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
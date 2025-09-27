'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Calendar, TrendingUp, Clock, CheckSquare, Target, BarChart3 } from 'lucide-react'

// サンプルデータ
const sampleData = {
  daily: {
    tasksCompleted: [2, 3, 1, 4, 2, 5, 3],
    pomodoroSessions: [4, 6, 2, 8, 4, 10, 6],
    focusTime: [100, 150, 50, 200, 100, 250, 150], // 分
    labels: ['月', '火', '水', '木', '金', '土', '日']
  },
  weekly: {
    tasksCompleted: [15, 18, 12, 22, 16],
    pomodoroSessions: [30, 35, 25, 40, 28],
    focusTime: [750, 875, 625, 1000, 700], // 分
    labels: ['第1週', '第2週', '第3週', '第4週', '第5週']
  },
  monthly: {
    tasksCompleted: [45, 52, 38, 65],
    pomodoroSessions: [120, 140, 100, 160],
    focusTime: [3000, 3500, 2500, 4000], // 分
    labels: ['1月', '2月', '3月', '4月']
  }
}

const stats = {
  totalTasks: 156,
  completedTasks: 123,
  totalPomodoroSessions: 245,
  totalFocusTime: 6125, // 分
  averageTasksPerDay: 3.5,
  averagePomodoroPerDay: 7.0,
  completionRate: 78.8,
  streakDays: 12
}

export default function ReportsPage() {
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('weekly')

  const currentData = sampleData[timeRange]

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}時間${mins}分` : `${mins}分`
  }

  const getMaxValue = (data: number[]) => Math.max(...data)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">レポート</h1>
          <p className="text-muted-foreground">
            あなたの生産性と進捗を詳しく分析します
          </p>
        </div>
        <Select value={timeRange} onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setTimeRange(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="期間を選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">過去7日間</SelectItem>
            <SelectItem value="weekly">過去5週間</SelectItem>
            <SelectItem value="monthly">過去4ヶ月</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 概要統計 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総タスク数</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              完了率: {stats.completionRate}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ポモドーロ</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPomodoroSessions}</div>
            <p className="text-xs text-muted-foreground">
              1日平均: {stats.averagePomodoroPerDay}回
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総集中時間</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(stats.totalFocusTime)}</div>
            <p className="text-xs text-muted-foreground">
              1日平均: {formatTime(Math.round(stats.totalFocusTime / 35))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">連続記録</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.streakDays}日</div>
            <p className="text-xs text-muted-foreground">
              連続でタスクを完了
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tasks">タスク分析</TabsTrigger>
          <TabsTrigger value="pomodoro">ポモドーロ分析</TabsTrigger>
          <TabsTrigger value="time">時間分析</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>タスク完了数の推移</CardTitle>
                <CardDescription>
                  期間別のタスク完了数
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentData.labels.map((label, index) => (
                    <div key={label} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{label}</span>
                        <span className="font-medium">{currentData.tasksCompleted[index]} タスク</span>
                      </div>
                      <Progress
                        value={(currentData.tasksCompleted[index] / getMaxValue(currentData.tasksCompleted)) * 100}
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>タスク完了率</CardTitle>
                <CardDescription>
                  全体的なパフォーマンス
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">完了タスク</span>
                    <span className="text-sm font-medium">{stats.completedTasks}/{stats.totalTasks}</span>
                  </div>
                  <Progress value={stats.completionRate} className="h-3" />
                  <p className="text-2xl font-bold text-center">{stats.completionRate}%</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-green-600">{stats.completedTasks}</p>
                    <p className="text-xs text-muted-foreground">完了</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-orange-600">{stats.totalTasks - stats.completedTasks}</p>
                    <p className="text-xs text-muted-foreground">未完了</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>カテゴリ別分析</CardTitle>
              <CardDescription>
                タスクのカテゴリ別分布
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center space-y-2">
                  <Badge className="bg-blue-100 text-blue-800">仕事</Badge>
                  <p className="text-2xl font-bold">45</p>
                  <p className="text-xs text-muted-foreground">37%</p>
                </div>
                <div className="text-center space-y-2">
                  <Badge className="bg-green-100 text-green-800">個人</Badge>
                  <p className="text-2xl font-bold">32</p>
                  <p className="text-xs text-muted-foreground">26%</p>
                </div>
                <div className="text-center space-y-2">
                  <Badge className="bg-purple-100 text-purple-800">学習</Badge>
                  <p className="text-2xl font-bold">28</p>
                  <p className="text-xs text-muted-foreground">23%</p>
                </div>
                <div className="text-center space-y-2">
                  <Badge className="bg-orange-100 text-orange-800">その他</Badge>
                  <p className="text-2xl font-bold">18</p>
                  <p className="text-xs text-muted-foreground">14%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pomodoro" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>ポモドーロセッション数</CardTitle>
                <CardDescription>
                  期間別のポモドーロセッション数
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentData.labels.map((label, index) => (
                    <div key={label} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{label}</span>
                        <span className="font-medium">{currentData.pomodoroSessions[index]} セッション</span>
                      </div>
                      <Progress
                        value={(currentData.pomodoroSessions[index] / getMaxValue(currentData.pomodoroSessions)) * 100}
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>集中パターン</CardTitle>
                <CardDescription>
                  最も生産性の高い時間帯
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">午前 (9-12時)</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={85} className="w-20 h-2" />
                      <span className="text-sm font-medium">85%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">午後 (13-17時)</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={70} className="w-20 h-2" />
                      <span className="text-sm font-medium">70%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">夜 (18-22時)</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={45} className="w-20 h-2" />
                      <span className="text-sm font-medium">45%</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">最も集中できる時間帯</p>
                  <p className="text-lg font-semibold">午前 9:00 - 12:00</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="time" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>集中時間の推移</CardTitle>
                <CardDescription>
                  期間別の集中時間
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentData.labels.map((label, index) => (
                    <div key={label} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{label}</span>
                        <span className="font-medium">{formatTime(currentData.focusTime[index])}</span>
                      </div>
                      <Progress
                        value={(currentData.focusTime[index] / getMaxValue(currentData.focusTime)) * 100}
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>時間効率</CardTitle>
                <CardDescription>
                  タスクあたりの平均時間
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-3xl font-bold">{formatTime(45)}</p>
                  <p className="text-sm text-muted-foreground">タスクあたりの平均時間</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-green-600">{formatTime(32)}</p>
                    <p className="text-xs text-muted-foreground">最短</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-orange-600">{formatTime(120)}</p>
                    <p className="text-xs text-muted-foreground">最長</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span>効率スコア</span>
                    <span className="font-medium">82/100</span>
                  </div>
                  <Progress value={82} className="mt-2 h-3" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
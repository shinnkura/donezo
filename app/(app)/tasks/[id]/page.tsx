'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Calendar, Flag, Clock, Play, Pause, Edit2, Save, X } from 'lucide-react'
import Link from 'next/link'

// TODO: 実際のデータ型に置き換える
interface Task {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  status: 'todo' | 'in_progress' | 'completed'
  dueDate: string
  tags: string[]
  createdAt: string
  updatedAt: string
  estimatedTime: number // 分
  actualTime: number // 分
}

// サンプルデータ
const sampleTask: Task = {
  id: '1',
  title: 'プレゼン資料作成',
  description: '来週の会議用のプレゼン資料を作成する。顧客向けの提案内容を含め、デザインも重視する必要がある。',
  priority: 'high',
  status: 'in_progress',
  dueDate: '2024-01-15',
  tags: ['仕事', '緊急', 'プレゼン'],
  createdAt: '2024-01-10',
  updatedAt: '2024-01-12',
  estimatedTime: 120,
  actualTime: 80
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800'
}

const priorityLabels = {
  low: '低',
  medium: '中',
  high: '高'
}

const statusLabels = {
  todo: '未完了',
  in_progress: '進行中',
  completed: '完了'
}

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [task, setTask] = useState<Task>(sampleTask)
  const [isEditing, setIsEditing] = useState(false)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [timerTime, setTimerTime] = useState(0)

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = () => {
    // TODO: タスクの更新処理
    setIsEditing(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning)
    // TODO: タイマーの開始/停止処理
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}時間${mins}分`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/tasks">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            タスク一覧へ戻る
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  {isEditing ? (
                    <Input
                      value={task.title}
                      onChange={(e) => setTask({ ...task, title: e.target.value })}
                      className="text-2xl font-bold"
                    />
                  ) : (
                    <CardTitle className="text-2xl">{task.title}</CardTitle>
                  )}
                  <div className="flex items-center space-x-2">
                    <Badge className={priorityColors[task.priority]}>
                      <Flag className="mr-1 h-3 w-3" />
                      {priorityLabels[task.priority]}
                    </Badge>
                    <Badge variant="outline">
                      {statusLabels[task.status]}
                    </Badge>
                    <Badge variant="outline">
                      <Calendar className="mr-1 h-3 w-3" />
                      期限: {task.dueDate}
                    </Badge>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {isEditing ? (
                    <>
                      <Button onClick={handleSave} size="sm">
                        <Save className="mr-2 h-4 w-4" />
                        保存
                      </Button>
                      <Button onClick={handleCancel} variant="outline" size="sm">
                        <X className="mr-2 h-4 w-4" />
                        キャンセル
                      </Button>
                    </>
                  ) : (
                    <Button onClick={handleEdit} variant="outline" size="sm">
                      <Edit2 className="mr-2 h-4 w-4" />
                      編集
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="description">説明</Label>
                {isEditing ? (
                  <textarea
                    id="description"
                    value={task.description}
                    onChange={(e) => setTask({ ...task, description: e.target.value })}
                    className="w-full min-h-[100px] p-3 border rounded-md"
                  />
                ) : (
                  <p className="mt-2 text-muted-foreground">{task.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">優先度</Label>
                  {isEditing ? (
                    <Select
                      value={task.priority}
                      onValueChange={(value: 'low' | 'medium' | 'high') =>
                        setTask({ ...task, priority: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">低</SelectItem>
                        <SelectItem value="medium">中</SelectItem>
                        <SelectItem value="high">高</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="mt-2">{priorityLabels[task.priority]}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="status">ステータス</Label>
                  {isEditing ? (
                    <Select
                      value={task.status}
                      onValueChange={(value: 'todo' | 'in_progress' | 'completed') =>
                        setTask({ ...task, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">未完了</SelectItem>
                        <SelectItem value="in_progress">進行中</SelectItem>
                        <SelectItem value="completed">完了</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="mt-2">{statusLabels[task.status]}</p>
                  )}
                </div>
              </div>

              <div>
                <Label>タグ</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {task.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>時間管理</CardTitle>
              <CardDescription>
                ポモドーロタイマーで集中して作業しましょう
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>見積もり時間</Label>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatTime(task.estimatedTime)}
                  </p>
                </div>
                <div>
                  <Label>実作業時間</Label>
                  <p className="text-2xl font-bold text-green-600">
                    {formatTime(task.actualTime)}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="text-center space-y-4">
                <div className="text-4xl font-mono">
                  {Math.floor(timerTime / 60).toString().padStart(2, '0')}:
                  {(timerTime % 60).toString().padStart(2, '0')}
                </div>
                <Button
                  onClick={toggleTimer}
                  className={isTimerRunning ? 'bg-red-600 hover:bg-red-700' : ''}
                >
                  {isTimerRunning ? (
                    <>
                      <Pause className="mr-2 h-4 w-4" />
                      停止
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      開始
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>タスク情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">作成日</span>
                <span className="text-sm">{task.createdAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">更新日</span>
                <span className="text-sm">{task.updatedAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">期限</span>
                <span className="text-sm">{task.dueDate}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>進捗</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox checked={task.status === 'completed'} />
                  <span className="text-sm">タスク完了</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox checked={task.actualTime >= task.estimatedTime} />
                  <span className="text-sm">見積もり時間到達</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>クイックアクション</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Clock className="mr-2 h-4 w-4" />
                ポモドーロ開始
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Edit2 className="mr-2 h-4 w-4" />
                タスク編集
              </Button>
              <Button variant="destructive" className="w-full justify-start">
                <X className="mr-2 h-4 w-4" />
                タスク削除
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { User, Bell, Palette, Clock, Shield, Database, Save, Upload } from 'lucide-react'

export default function SettingsPage() {
  const { data: session } = useSession()
  const [settings, setSettings] = useState({
    profile: {
      name: session?.user?.name || '',
      email: session?.user?.email || '',
      avatar: session?.user?.image || '',
    },
    notifications: {
      taskReminders: true,
      pomodoroComplete: true,
      dailyReport: false,
      weeklyReport: true,
      sound: true,
      browser: true,
    },
    pomodoro: {
      workDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      longBreakInterval: 4,
      autoStartBreaks: false,
      autoStartPomodoros: false,
    },
    appearance: {
      theme: 'system',
      language: 'ja',
      timeFormat: '24h',
      dateFormat: 'yyyy-mm-dd',
    },
    privacy: {
      dataCollection: true,
      analytics: false,
      shareProgress: false,
    }
  })

  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    // TODO: 設定を保存する処理
    await new Promise(resolve => setTimeout(resolve, 1000)) // 模擬的な保存処理
    setIsSaving(false)
  }

  const updateSetting = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value
      }
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">設定</h1>
          <p className="text-muted-foreground">
            アプリケーションの設定をカスタマイズしましょう
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? '保存中...' : '設定を保存'}
        </Button>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">プロフィール</TabsTrigger>
          <TabsTrigger value="notifications">通知</TabsTrigger>
          <TabsTrigger value="pomodoro">ポモドーロ</TabsTrigger>
          <TabsTrigger value="appearance">外観</TabsTrigger>
          <TabsTrigger value="privacy">プライバシー</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>プロフィール情報</CardTitle>
              <CardDescription>
                アカウントの基本情報を管理します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={settings.profile.avatar} alt="プロフィール画像" />
                  <AvatarFallback className="text-lg">
                    {settings.profile.name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    画像を変更
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    JPG、PNG形式、5MB以下
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">お名前</Label>
                  <Input
                    id="name"
                    value={settings.profile.name}
                    onChange={(e) => updateSetting('profile', 'name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">メールアドレス</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.profile.email}
                    onChange={(e) => updateSetting('profile', 'email', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>アカウント統計</CardTitle>
              <CardDescription>
                あなたの活動状況
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">156</p>
                  <p className="text-sm text-muted-foreground">総タスク数</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">245</p>
                  <p className="text-sm text-muted-foreground">ポモドーロ</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-sm text-muted-foreground">連続記録（日）</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>通知設定</CardTitle>
              <CardDescription>
                受け取りたい通知の種類を選択してください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>タスクのリマインダー</Label>
                    <p className="text-sm text-muted-foreground">
                      期限が近づいたタスクを通知します
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.taskReminders}
                    onCheckedChange={(checked) => updateSetting('notifications', 'taskReminders', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>ポモドーロ完了通知</Label>
                    <p className="text-sm text-muted-foreground">
                      ポモドーロセッションが完了したときに通知します
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.pomodoroComplete}
                    onCheckedChange={(checked) => updateSetting('notifications', 'pomodoroComplete', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>日次レポート</Label>
                    <p className="text-sm text-muted-foreground">
                      1日の活動をまとめたレポートを送信します
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.dailyReport}
                    onCheckedChange={(checked) => updateSetting('notifications', 'dailyReport', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>週次レポート</Label>
                    <p className="text-sm text-muted-foreground">
                      1週間の活動をまとめたレポートを送信します
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.weeklyReport}
                    onCheckedChange={(checked) => updateSetting('notifications', 'weeklyReport', checked)}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">通知方法</h4>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>音による通知</Label>
                    <p className="text-sm text-muted-foreground">
                      通知時に音で知らせます
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.sound}
                    onCheckedChange={(checked) => updateSetting('notifications', 'sound', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>ブラウザ通知</Label>
                    <p className="text-sm text-muted-foreground">
                      ブラウザの通知機能を使用します
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.browser}
                    onCheckedChange={(checked) => updateSetting('notifications', 'browser', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pomodoro" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ポモドーロ設定</CardTitle>
              <CardDescription>
                ポモドーロタイマーの動作をカスタマイズします
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="work-duration">作業時間（分）</Label>
                  <Input
                    id="work-duration"
                    type="number"
                    min="5"
                    max="60"
                    value={settings.pomodoro.workDuration}
                    onChange={(e) => updateSetting('pomodoro', 'workDuration', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="short-break">ショートブレイク（分）</Label>
                  <Input
                    id="short-break"
                    type="number"
                    min="1"
                    max="30"
                    value={settings.pomodoro.shortBreakDuration}
                    onChange={(e) => updateSetting('pomodoro', 'shortBreakDuration', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="long-break">ロングブレイク（分）</Label>
                  <Input
                    id="long-break"
                    type="number"
                    min="5"
                    max="60"
                    value={settings.pomodoro.longBreakDuration}
                    onChange={(e) => updateSetting('pomodoro', 'longBreakDuration', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="long-break-interval">ロングブレイク間隔</Label>
                  <Input
                    id="long-break-interval"
                    type="number"
                    min="2"
                    max="10"
                    value={settings.pomodoro.longBreakInterval}
                    onChange={(e) => updateSetting('pomodoro', 'longBreakInterval', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>ブレイクを自動開始</Label>
                    <p className="text-sm text-muted-foreground">
                      作業時間が終了したら自動的にブレイクを開始します
                    </p>
                  </div>
                  <Switch
                    checked={settings.pomodoro.autoStartBreaks}
                    onCheckedChange={(checked) => updateSetting('pomodoro', 'autoStartBreaks', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>ポモドーロを自動開始</Label>
                    <p className="text-sm text-muted-foreground">
                      ブレイクが終了したら自動的に次のポモドーロを開始します
                    </p>
                  </div>
                  <Switch
                    checked={settings.pomodoro.autoStartPomodoros}
                    onCheckedChange={(checked) => updateSetting('pomodoro', 'autoStartPomodoros', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>外観設定</CardTitle>
              <CardDescription>
                アプリケーションの見た目をカスタマイズします
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">テーマ</Label>
                  <Select
                    value={settings.appearance.theme}
                    onValueChange={(value) => updateSetting('appearance', 'theme', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">ライト</SelectItem>
                      <SelectItem value="dark">ダーク</SelectItem>
                      <SelectItem value="system">システム設定に従う</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">言語</Label>
                  <Select
                    value={settings.appearance.language}
                    onValueChange={(value) => updateSetting('appearance', 'language', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ja">日本語</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time-format">時刻形式</Label>
                  <Select
                    value={settings.appearance.timeFormat}
                    onValueChange={(value) => updateSetting('appearance', 'timeFormat', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12時間形式</SelectItem>
                      <SelectItem value="24h">24時間形式</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date-format">日付形式</Label>
                  <Select
                    value={settings.appearance.dateFormat}
                    onValueChange={(value) => updateSetting('appearance', 'dateFormat', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                      <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>プライバシー設定</CardTitle>
              <CardDescription>
                データの収集と使用に関する設定
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>使用データの収集</Label>
                    <p className="text-sm text-muted-foreground">
                      アプリの改善のために使用データを収集します
                    </p>
                  </div>
                  <Switch
                    checked={settings.privacy.dataCollection}
                    onCheckedChange={(checked) => updateSetting('privacy', 'dataCollection', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>分析データの送信</Label>
                    <p className="text-sm text-muted-foreground">
                      匿名化された分析データを送信します
                    </p>
                  </div>
                  <Switch
                    checked={settings.privacy.analytics}
                    onCheckedChange={(checked) => updateSetting('privacy', 'analytics', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>進捗の共有</Label>
                    <p className="text-sm text-muted-foreground">
                      他のユーザーと進捗を共有します
                    </p>
                  </div>
                  <Switch
                    checked={settings.privacy.shareProgress}
                    onCheckedChange={(checked) => updateSetting('privacy', 'shareProgress', checked)}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">データ管理</h4>
                <div className="flex space-x-4">
                  <Button variant="outline">
                    <Database className="mr-2 h-4 w-4" />
                    データをエクスポート
                  </Button>
                  <Button variant="destructive">
                    <Shield className="mr-2 h-4 w-4" />
                    データを削除
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
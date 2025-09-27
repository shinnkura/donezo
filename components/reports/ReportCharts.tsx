'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card } from '@/components/ui/card'

interface ReportChartsProps {
  sessions: any[]
  tasks: any[]
  projects: any[]
  dateRange: 'day' | 'week' | 'month'
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export function ReportCharts({
  sessions,
  tasks,
  projects,
  dateRange,
}: ReportChartsProps) {
  const focusTimeData = useMemo(() => {
    const data: { [key: string]: number } = {}
    const now = new Date()

    const getDaysToShow = () => {
      switch (dateRange) {
        case 'day': return 1
        case 'week': return 7
        case 'month': return 30
        default: return 7
      }
    }

    const daysToShow = getDaysToShow()

    for (let i = 0; i < daysToShow; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const key = date.toLocaleDateString('ja-JP')
      data[key] = 0
    }

    sessions.forEach((session) => {
      if (session.kind === 'FOCUS' && session.isCompleted) {
        const sessionDate = new Date(session.startedAt)
        const key = sessionDate.toLocaleDateString('ja-JP')
        if (data[key] !== undefined) {
          data[key] += Math.round(session.durationSec / 60)
        }
      }
    })

    return Object.entries(data)
      .map(([date, minutes]) => ({ date, minutes }))
      .reverse()
  }, [sessions, dateRange])

  const projectDistribution = useMemo(() => {
    const data: { [key: string]: number } = {}

    sessions.forEach((session) => {
      if (session.kind === 'FOCUS' && session.task?.project) {
        const projectName = session.task.project.name
        data[projectName] = (data[projectName] || 0) + session.durationSec
      }
    })

    return Object.entries(data).map(([name, seconds]) => ({
      name,
      value: Math.round(seconds / 60),
    }))
  }, [sessions])

  const completionRate = useMemo(() => {
    const completed = tasks.filter((t) => t.isDone).length
    const total = tasks.length
    return total > 0 ? Math.round((completed / total) * 100) : 0
  }, [tasks])

  const pomodoroComparison = useMemo(() => {
    const data = tasks.map((task) => ({
      title: task.title.substring(0, 20),
      estimated: task.estimatePomos,
      actual: task.completedPomos,
    }))
    return data.slice(0, 10)
  }, [tasks])

  return (
    <div className="grid gap-6">
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">日別集中時間（分）</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={focusTimeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="minutes"
              stroke="#3b82f6"
              strokeWidth={2}
              name="集中時間"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold">プロジェクト別配分</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={projectDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {projectDistribution.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold">
            見積り vs 実績ポモドーロ数
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pomodoroComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="title" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="estimated" fill="#3b82f6" name="見積り" />
              <Bar dataKey="actual" fill="#10b981" name="実績" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">統計サマリー</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">総集中時間</p>
            <p className="text-2xl font-bold">
              {Math.round(
                sessions
                  .filter((s) => s.kind === 'FOCUS' && s.isCompleted)
                  .reduce((acc, s) => acc + s.durationSec, 0) / 60
              )}
              分
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">完了タスク</p>
            <p className="text-2xl font-bold">
              {tasks.filter((t) => t.isDone).length} / {tasks.length}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">達成率</p>
            <p className="text-2xl font-bold">{completionRate}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              平均ポモドーロ/タスク
            </p>
            <p className="text-2xl font-bold">
              {tasks.length > 0
                ? (
                    tasks.reduce((acc, t) => acc + t.completedPomos, 0) /
                    tasks.length
                  ).toFixed(1)
                : '0'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
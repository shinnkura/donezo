'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  CalendarDays,
  CheckSquare,
  Calendar,
  Target,
  CheckCircle2,
  FolderOpen,
  Plus,
  Settings,
  ChevronDown,
  ChevronRight,
  Folder
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface Project {
  id: string
  name: string
  color: string
  _count?: {
    tasks: number
  }
}

const timeBasedViews = [
  {
    name: '今日',
    filter: 'today',
    icon: CalendarDays,
    count: 0,
  },
  {
    name: '明日',
    filter: 'tomorrow',
    icon: Calendar,
    count: 0,
  },
  {
    name: '今週',
    filter: 'week',
    icon: Calendar,
    count: 0,
  },
  {
    name: '計画',
    filter: 'planned',
    icon: Target,
    count: 0,
  },
  {
    name: '完了済み',
    filter: 'completed',
    icon: CheckCircle2,
    count: 21,
  },
]

const bottomNavigation = [
  {
    name: '設定',
    href: '/settings',
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [isProjectsOpen, setIsProjectsOpen] = useState(true)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/actions/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getProjects' }),
      })

      if (response.ok) {
        const data = await response.json()
        // デフォルトプロジェクトを追加
        const projectsWithDefault = [
          { id: 'work', name: 'WORK', color: '#3B82F6', _count: { tasks: 21 } },
          { id: 'study', name: 'STUDY', color: '#10B981', _count: { tasks: 11 } },
          { id: 'develop', name: 'DEVELOP', color: '#8B5CF6', _count: { tasks: 8 } },
          ...data.projects,
        ]
        setProjects(projectsWithDefault)
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    }
  }

  const handleNavigation = (filter: string, projectId?: string) => {
    if (projectId) {
      router.push(`/tasks/unified?filter=project&project=${projectId}`)
    } else {
      router.push(`/tasks/unified?filter=${filter}`)
    }
  }

  const isActiveFilter = (filter: string, projectId?: string) => {
    const params = new URLSearchParams(pathname.split('?')[1] || '')
    if (projectId) {
      return params.get('filter') === 'project' && params.get('project') === projectId
    }
    return params.get('filter') === filter
  }

  return (
    <div className="flex h-full w-64 flex-col bg-background border-r">
      {/* ロゴ */}
      <div className="flex h-14 items-center px-4 border-b">
        <Link href="/" className="flex items-center space-x-2">
          <CheckSquare className="h-5 w-5 text-primary" />
          <span className="text-lg font-semibold">しんぞう</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto">
        {/* タイムベースビュー */}
        <div className="p-3 space-y-1">
          {timeBasedViews.map((item) => {
            const isActive = isActiveFilter(item.filter)
            return (
              <Button
                key={item.name}
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-between px-2 h-9',
                  isActive && 'bg-secondary text-secondary-foreground'
                )}
                onClick={() => handleNavigation(item.filter)}
              >
                <div className="flex items-center">
                  <item.icon className="mr-2 h-4 w-4" />
                  <span className="text-sm">{item.name}</span>
                </div>
                {item.count > 0 && (
                  <span className="text-xs text-muted-foreground">{item.count}</span>
                )}
              </Button>
            )
          })}
        </div>

        <Separator className="my-2" />

        {/* プロジェクトセクション */}
        <div className="px-3">
          <Collapsible open={isProjectsOpen} onOpenChange={setIsProjectsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between px-2 h-9 hover:bg-transparent"
              >
                <div className="flex items-center">
                  {isProjectsOpen ? (
                    <ChevronDown className="mr-2 h-4 w-4" />
                  ) : (
                    <ChevronRight className="mr-2 h-4 w-4" />
                  )}
                  <span className="text-sm font-semibold">プロジェクト</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation()
                    // プロジェクト作成ダイアログを開く
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-1">
              {projects.map((project) => {
                const isActive = isActiveFilter('project', project.id)
                return (
                  <Button
                    key={project.id}
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-between px-2 h-9 pl-6',
                      isActive && 'bg-secondary text-secondary-foreground'
                    )}
                    onClick={() => handleNavigation('project', project.id)}
                  >
                    <div className="flex items-center">
                      <div
                        className="w-2 h-2 rounded-full mr-2"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="text-sm">{project.name}</span>
                    </div>
                    {project._count && project._count.tasks > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {project._count.tasks}
                      </span>
                    )}
                  </Button>
                )
              })}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </nav>

      {/* 底部ナビゲーション */}
      <div className="p-3">
        <Separator className="mb-3" />
        {bottomNavigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start px-2 h-9',
                  isActive && 'bg-secondary text-secondary-foreground'
                )}
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span className="text-sm">{item.name}</span>
              </Button>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
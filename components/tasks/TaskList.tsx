'use client'

import React, { useState, useCallback, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Archive,
  CheckCheck,
  ListTodo,
  Calendar,
  Flag,
  Folder,
  SortAsc,
  SortDesc,
} from 'lucide-react'
import { TaskItem } from './TaskItem'
import { TaskDialog } from './TaskDialog'
import { useTaskStore, TaskWithProject, TaskFilters, TaskSortOptions } from '@/lib/store/useTaskStore'
import { useSettingsStore } from '@/lib/store/useSettingsStore'
import { TaskStatus, Priority } from '@prisma/client'
import { cn } from '@/lib/utils'

interface TaskListProps {
  projectId?: string
  showHeader?: boolean
  showFilters?: boolean
  showQuickAdd?: boolean
  maxHeight?: string
  className?: string
}

export function TaskList({
  projectId,
  showHeader = true,
  showFilters = true,
  showQuickAdd = true,
  maxHeight = '600px',
  className,
}: TaskListProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())

  // Store から状態とアクション取得
  const {
    tasks,
    filters,
    sortOptions,
    isLoading,
    error,
    setFilters,
    setSortOptions,
    moveTask,
    bulkUpdateTasks,
    clearCompleted,
    getFilteredTasks,
  } = useTaskStore()

  const { settings } = useSettingsStore()

  // ドラッグ&ドロップセンサー
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // フィルタリングされたタスク
  const filteredTasks = useMemo(() => {
    let tasksToFilter = getFilteredTasks()

    // プロジェクトIDでフィルタ
    if (projectId) {
      tasksToFilter = tasksToFilter.filter(task => task.projectId === projectId)
    }

    // 検索クエリでフィルタ
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      tasksToFilter = tasksToFilter.filter(
        task =>
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query) ||
          task.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return tasksToFilter
  }, [getFilteredTasks, projectId, searchQuery])

  // ドラッグ開始
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  // ドラッグ終了
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        const oldIndex = filteredTasks.findIndex(task => task.id === active.id)
        const newIndex = filteredTasks.findIndex(task => task.id === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
          // ローカルでの並び替え（楽観的更新）
          const reorderedTasks = arrayMove(filteredTasks, oldIndex, newIndex)

          // サーバーに新しい位置を送信
          moveTask(active.id as string, newIndex)
        }
      }

      setActiveId(null)
    },
    [filteredTasks, moveTask]
  )

  // フィルター更新
  const updateFilter = useCallback(
    (key: keyof TaskFilters, value: any) => {
      setFilters({ [key]: value })
    },
    [setFilters]
  )

  // ソート更新
  const updateSort = useCallback(
    (field: TaskSortOptions['field']) => {
      const newDirection = sortOptions.field === field && sortOptions.direction === 'asc' ? 'desc' : 'asc'
      setSortOptions({ field, direction: newDirection })
    },
    [sortOptions, setSortOptions]
  )

  // タスク選択
  const toggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTasks(prev => {
      const newSelection = new Set(prev)
      if (newSelection.has(taskId)) {
        newSelection.delete(taskId)
      } else {
        newSelection.add(taskId)
      }
      return newSelection
    })
  }, [])

  // 全選択/全解除
  const toggleSelectAll = useCallback(() => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set())
    } else {
      setSelectedTasks(new Set(filteredTasks.map(task => task.id)))
    }
  }, [selectedTasks.size, filteredTasks])

  // 一括操作
  const handleBulkAction = useCallback(
    (action: string, value?: any) => {
      if (selectedTasks.size === 0) return

      const taskIds = Array.from(selectedTasks)

      switch (action) {
        case 'complete':
          bulkUpdateTasks(taskIds, { status: 'COMPLETED' })
          break
        case 'todo':
          bulkUpdateTasks(taskIds, { status: 'TODO' })
          break
        case 'priority':
          bulkUpdateTasks(taskIds, { priority: value })
          break
        case 'project':
          bulkUpdateTasks(taskIds, { projectId: value })
          break
        case 'archive':
          bulkUpdateTasks(taskIds, { archived: true })
          break
      }

      setSelectedTasks(new Set())
    },
    [selectedTasks, bulkUpdateTasks]
  )

  // 統計情報
  const stats = useMemo(() => {
    return {
      total: filteredTasks.length,
      completed: filteredTasks.filter(task => task.status === 'COMPLETED').length,
      inProgress: filteredTasks.filter(task => task.status === 'IN_PROGRESS').length,
      todo: filteredTasks.filter(task => task.status === 'TODO').length,
    }
  }, [filteredTasks])

  // 現在ドラッグ中のタスク
  const activeTask = activeId ? filteredTasks.find(task => task.id === activeId) : null

  if (error) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-6 text-center">
          <p className="text-destructive">エラーが発生しました: {error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('w-full', className)}>
      {showHeader && (
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ListTodo className="h-5 w-5" />
                タスク
                {projectId && (
                  <Badge variant="secondary" className="ml-2">
                    プロジェクト限定
                  </Badge>
                )}
              </CardTitle>
              <div className="flex gap-4 text-sm text-muted-foreground mt-2">
                <span>合計: {stats.total}</span>
                <span>完了: {stats.completed}</span>
                <span>進行中: {stats.inProgress}</span>
                <span>未着手: {stats.todo}</span>
              </div>
            </div>
            <div className="flex gap-2">
              {showQuickAdd && (
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  size="sm"
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  タスク追加
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>一括操作</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={toggleSelectAll}
                    disabled={filteredTasks.length === 0}
                  >
                    {selectedTasks.size === filteredTasks.length ? '全解除' : '全選択'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction('complete')}
                    disabled={selectedTasks.size === 0}
                  >
                    <CheckCheck className="h-4 w-4 mr-2" />
                    選択を完了
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction('archive')}
                    disabled={selectedTasks.size === 0}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    選択をアーカイブ
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => clearCompleted()}>
                    <Archive className="h-4 w-4 mr-2" />
                    完了済みをクリア
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="p-0">
        {showFilters && (
          <div className="p-4 border-b bg-muted/30">
            {/* 検索バー */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="タスクを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* フィルターと並び替え */}
            <div className="flex flex-wrap gap-2">
              {/* ステータスフィルター */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-1" />
                    ステータス
                    {filters.status !== 'all' && (
                      <Badge variant="secondary" className="ml-1">
                        1
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuRadioGroup
                    value={filters.status || 'all'}
                    onValueChange={(value) => updateFilter('status', value)}
                  >
                    <DropdownMenuRadioItem value="all">すべて</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="TODO">未着手</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="IN_PROGRESS">進行中</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="COMPLETED">完了</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="CANCELLED">キャンセル</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 優先度フィルター */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Flag className="h-4 w-4 mr-1" />
                    優先度
                    {filters.priority !== 'all' && (
                      <Badge variant="secondary" className="ml-1">
                        1
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuRadioGroup
                    value={filters.priority || 'all'}
                    onValueChange={(value) => updateFilter('priority', value)}
                  >
                    <DropdownMenuRadioItem value="all">すべて</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="URGENT">緊急</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="HIGH">高</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="MEDIUM">中</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="LOW">低</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 並び替え */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {sortOptions.direction === 'asc' ? (
                      <SortAsc className="h-4 w-4 mr-1" />
                    ) : (
                      <SortDesc className="h-4 w-4 mr-1" />
                    )}
                    並び替え
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => updateSort('createdAt')}>
                    作成日
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateSort('updatedAt')}>
                    更新日
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateSort('dueDate')}>
                    期限日
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateSort('priority')}>
                    優先度
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateSort('title')}>
                    タイトル
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* フィルタークリア */}
              {(filters.status !== 'all' || filters.priority !== 'all' || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilters({
                      status: 'all',
                      priority: 'all',
                      projectId: 'all',
                      search: '',
                      tags: [],
                    })
                    setSearchQuery('')
                  }}
                >
                  フィルタークリア
                </Button>
              )}
            </div>
          </div>
        )}

        {/* タスクリスト */}
        <ScrollArea className="h-full" style={{ maxHeight }}>
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">読み込み中...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-8 text-center">
              <ListTodo className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || filters.status !== 'all' || filters.priority !== 'all'
                  ? 'フィルター条件に一致するタスクが見つかりません'
                  : 'まだタスクがありません'}
              </p>
              {showQuickAdd && !searchQuery && (
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="mt-4"
                >
                  最初のタスクを作成
                </Button>
              )}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext
                items={filteredTasks.map(task => task.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="p-4 space-y-2">
                  {filteredTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      isSelected={selectedTasks.has(task.id)}
                      onSelect={() => toggleTaskSelection(task.id)}
                      showProject={!projectId}
                      showSelection={selectedTasks.size > 0}
                    />
                  ))}
                </div>
              </SortableContext>

              <DragOverlay>
                {activeTask && (
                  <TaskItem
                    task={activeTask}
                    isSelected={false}
                    onSelect={() => {}}
                    showProject={!projectId}
                    isDragging
                  />
                )}
              </DragOverlay>
            </DndContext>
          )}
        </ScrollArea>
      </CardContent>

      {/* タスク作成ダイアログ */}
      <TaskDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        defaultProjectId={projectId}
      />
    </Card>
  )
}
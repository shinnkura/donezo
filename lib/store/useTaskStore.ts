'use client'

import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { Task, Project, Priority, TaskStatus } from '@prisma/client'

// 拡張されたタスク型（プロジェクト情報を含む）
export interface TaskWithProject extends Task {
  project?: Project | null
  subtasks?: TaskWithProject[]
  parentTask?: TaskWithProject | null
}

// フィルターとソートのオプション
export interface TaskFilters {
  status?: TaskStatus | 'all'
  priority?: Priority | 'all'
  projectId?: string | 'all'
  dueDateRange?: {
    start?: Date
    end?: Date
  }
  search?: string
  tags?: string[]
}

export interface TaskSortOptions {
  field: 'createdAt' | 'updatedAt' | 'dueDate' | 'priority' | 'title'
  direction: 'asc' | 'desc'
}

interface TaskState {
  // State
  tasks: TaskWithProject[]
  selectedTaskId: string | null
  filters: TaskFilters
  sortOptions: TaskSortOptions
  isLoading: boolean
  error: string | null
  optimisticUpdates: Map<string, Partial<TaskWithProject>>

  // Actions
  setTasks: (tasks: TaskWithProject[]) => void
  addTask: (task: TaskWithProject) => void
  updateTask: (taskId: string, updates: Partial<TaskWithProject>) => void
  deleteTask: (taskId: string) => void
  moveTask: (taskId: string, newPosition: number) => void
  bulkUpdateTasks: (taskIds: string[], updates: Partial<TaskWithProject>) => void

  // Selection
  setSelectedTaskId: (taskId: string | null) => void

  // Filtering and Sorting
  setFilters: (filters: Partial<TaskFilters>) => void
  setSortOptions: (sortOptions: TaskSortOptions) => void
  getFilteredTasks: () => TaskWithProject[]

  // Optimistic Updates
  setOptimisticUpdate: (taskId: string, updates: Partial<TaskWithProject>) => void
  clearOptimisticUpdate: (taskId: string) => void
  clearAllOptimisticUpdates: () => void

  // Loading and Error states
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Utility functions
  getTaskById: (taskId: string) => TaskWithProject | undefined
  getSubtasks: (parentTaskId: string) => TaskWithProject[]
  getTasksByProject: (projectId: string) => TaskWithProject[]
  clearCompleted: () => void

  // Reset
  reset: () => void
}

const initialState = {
  tasks: [],
  selectedTaskId: null,
  filters: {
    status: 'all' as const,
    priority: 'all' as const,
    projectId: 'all' as const,
    search: '',
    tags: [],
  },
  sortOptions: {
    field: 'createdAt' as const,
    direction: 'desc' as const,
  },
  isLoading: false,
  error: null,
  optimisticUpdates: new Map(),
}

export const useTaskStore = create<TaskState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialState,

        // Actions
        setTasks: (tasks) =>
          set({ tasks, error: null }),

        addTask: (task) =>
          set((state) => ({
            tasks: [task, ...state.tasks],
            error: null,
          })),

        updateTask: (taskId, updates) =>
          set((state) => ({
            tasks: state.tasks.map((task) =>
              task.id === taskId ? { ...task, ...updates } : task
            ),
            error: null,
          })),

        deleteTask: (taskId) =>
          set((state) => ({
            tasks: state.tasks.filter((task) => task.id !== taskId),
            selectedTaskId: state.selectedTaskId === taskId ? null : state.selectedTaskId,
            error: null,
          })),

        moveTask: (taskId, newPosition) =>
          set((state) => {
            const tasks = [...state.tasks]
            const taskIndex = tasks.findIndex((task) => task.id === taskId)

            if (taskIndex === -1) return state

            const [movedTask] = tasks.splice(taskIndex, 1)
            tasks.splice(newPosition, 0, movedTask)

            return { tasks }
          }),

        bulkUpdateTasks: (taskIds, updates) =>
          set((state) => ({
            tasks: state.tasks.map((task) =>
              taskIds.includes(task.id) ? { ...task, ...updates } : task
            ),
            error: null,
          })),

        // Selection
        setSelectedTaskId: (taskId) =>
          set({ selectedTaskId: taskId }),

        // Filtering and Sorting
        setFilters: (filters) =>
          set((state) => ({
            filters: { ...state.filters, ...filters },
          })),

        setSortOptions: (sortOptions) =>
          set({ sortOptions }),

        getFilteredTasks: () => {
          const { tasks, filters, sortOptions } = get()
          let filteredTasks = [...tasks]

          // Apply filters
          if (filters.status && filters.status !== 'all') {
            filteredTasks = filteredTasks.filter((task) => task.status === filters.status)
          }

          if (filters.priority && filters.priority !== 'all') {
            filteredTasks = filteredTasks.filter((task) => task.priority === filters.priority)
          }

          if (filters.projectId && filters.projectId !== 'all') {
            filteredTasks = filteredTasks.filter((task) => task.projectId === filters.projectId)
          }

          if (filters.search) {
            const searchLower = filters.search.toLowerCase()
            filteredTasks = filteredTasks.filter((task) =>
              task.title.toLowerCase().includes(searchLower) ||
              task.description?.toLowerCase().includes(searchLower)
            )
          }

          if (filters.tags && filters.tags.length > 0) {
            filteredTasks = filteredTasks.filter((task) =>
              filters.tags!.some((tag) => task.tags?.includes(tag))
            )
          }

          if (filters.dueDateRange) {
            const { start, end } = filters.dueDateRange
            filteredTasks = filteredTasks.filter((task) => {
              if (!task.dueDate) return false
              const dueDate = new Date(task.dueDate)
              if (start && dueDate < start) return false
              if (end && dueDate > end) return false
              return true
            })
          }

          // Apply sorting
          filteredTasks.sort((a, b) => {
            const { field, direction } = sortOptions
            let aValue: any = a[field]
            let bValue: any = b[field]

            // Handle date fields
            if (field === 'dueDate' || field === 'createdAt' || field === 'updatedAt') {
              aValue = aValue ? new Date(aValue).getTime() : 0
              bValue = bValue ? new Date(bValue).getTime() : 0
            }

            // Handle priority field
            if (field === 'priority') {
              const priorityOrder = { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 }
              aValue = priorityOrder[aValue as Priority] || 0
              bValue = priorityOrder[bValue as Priority] || 0
            }

            // Handle string fields
            if (typeof aValue === 'string' && typeof bValue === 'string') {
              aValue = aValue.toLowerCase()
              bValue = bValue.toLowerCase()
            }

            if (aValue < bValue) return direction === 'asc' ? -1 : 1
            if (aValue > bValue) return direction === 'asc' ? 1 : -1
            return 0
          })

          return filteredTasks
        },

        // Optimistic Updates
        setOptimisticUpdate: (taskId, updates) =>
          set((state) => {
            const newOptimisticUpdates = new Map(state.optimisticUpdates)
            newOptimisticUpdates.set(taskId, {
              ...newOptimisticUpdates.get(taskId),
              ...updates,
            })
            return { optimisticUpdates: newOptimisticUpdates }
          }),

        clearOptimisticUpdate: (taskId) =>
          set((state) => {
            const newOptimisticUpdates = new Map(state.optimisticUpdates)
            newOptimisticUpdates.delete(taskId)
            return { optimisticUpdates: newOptimisticUpdates }
          }),

        clearAllOptimisticUpdates: () =>
          set({ optimisticUpdates: new Map() }),

        // Loading and Error states
        setLoading: (loading) =>
          set({ isLoading: loading }),

        setError: (error) =>
          set({ error }),

        // Utility functions
        getTaskById: (taskId) => {
          const { tasks, optimisticUpdates } = get()
          const task = tasks.find((t) => t.id === taskId)
          if (!task) return undefined

          const optimisticUpdate = optimisticUpdates.get(taskId)
          return optimisticUpdate ? { ...task, ...optimisticUpdate } : task
        },

        getSubtasks: (parentTaskId) => {
          const { tasks } = get()
          return tasks.filter((task) => task.parentTaskId === parentTaskId)
        },

        getTasksByProject: (projectId) => {
          const { tasks } = get()
          return tasks.filter((task) => task.projectId === projectId)
        },

        clearCompleted: () =>
          set((state) => ({
            tasks: state.tasks.filter((task) => task.status !== 'COMPLETED'),
          })),

        // Reset
        reset: () =>
          set(initialState),
      }),
      {
        name: 'task-store',
        partialize: (state) => ({
          filters: state.filters,
          sortOptions: state.sortOptions,
          selectedTaskId: state.selectedTaskId,
        }),
      }
    )
  )
)

// セレクタ関数
export const useSelectedTask = () => {
  const selectedTaskId = useTaskStore((state) => state.selectedTaskId)
  const getTaskById = useTaskStore((state) => state.getTaskById)
  return selectedTaskId ? getTaskById(selectedTaskId) : null
}

export const useFilteredTasks = () => {
  return useTaskStore((state) => state.getFilteredTasks())
}

export const useTasksByProject = (projectId: string) => {
  return useTaskStore((state) => state.getTasksByProject(projectId))
}

export const useSubtasks = (parentTaskId: string) => {
  return useTaskStore((state) => state.getSubtasks(parentTaskId))
}
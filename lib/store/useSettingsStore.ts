'use client'

import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'

// アプリケーション全体の設定
export interface AppSettings {
  // 外観設定
  theme: 'light' | 'dark' | 'system'
  accentColor: string
  fontSize: 'small' | 'medium' | 'large'
  compactMode: boolean
  showSidebar: boolean
  sidebarCollapsed: boolean

  // 言語と地域
  language: 'ja' | 'en'
  timezone: string
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY/MM/DD'
  timeFormat: '12h' | '24h'
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = Sunday, 1 = Monday, etc.

  // 通知設定
  notifications: {
    enabled: boolean
    sound: boolean
    desktop: boolean
    email: boolean
    taskReminders: boolean
    pomodoroAlerts: boolean
    breakReminders: boolean
    dailySummary: boolean
  }

  // タスク設定
  tasks: {
    defaultPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
    autoArchiveCompleted: boolean
    autoArchiveDays: number
    showSubtasks: boolean
    showProjectColors: boolean
    enableDragDrop: boolean
    confirmDelete: boolean
    enableQuickAdd: boolean
  }

  // プロジェクト設定
  projects: {
    showInactive: boolean
    defaultView: 'list' | 'grid' | 'kanban'
    autoColorize: boolean
  }

  // 同期設定
  sync: {
    enabled: boolean
    autoSync: boolean
    syncInterval: number // 分
    conflictResolution: 'local' | 'remote' | 'manual'
    offlineMode: boolean
  }

  // プライバシー設定
  privacy: {
    analytics: boolean
    crashReporting: boolean
    usageStats: boolean
    shareData: boolean
  }

  // 実験的機能
  experimental: {
    enableFeatureX: boolean
    enableFeatureY: boolean
  }
}

// キーボードショートカット
export interface KeyboardShortcuts {
  // グローバル
  toggleTheme: string
  toggleSidebar: string
  quickSearch: string
  quickAdd: string

  // タスク
  createTask: string
  editTask: string
  deleteTask: string
  toggleComplete: string
  markImportant: string

  // タイマー
  startTimer: string
  pauseTimer: string
  stopTimer: string
  skipBreak: string

  // ナビゲーション
  goToTasks: string
  goToTimer: string
  goToReports: string
  goToSettings: string
}

interface SettingsState {
  // Settings
  settings: AppSettings
  shortcuts: KeyboardShortcuts
  isLoading: boolean
  error: string | null
  hasUnsavedChanges: boolean

  // Actions
  updateSettings: (settings: Partial<AppSettings>) => void
  updateShortcuts: (shortcuts: Partial<KeyboardShortcuts>) => void
  resetSettings: () => void
  resetShortcuts: () => void
  importSettings: (settingsData: string) => Promise<void>
  exportSettings: () => string

  // Individual setting updates
  setTheme: (theme: AppSettings['theme']) => void
  setLanguage: (language: AppSettings['language']) => void
  toggleSidebar: () => void
  toggleCompactMode: () => void
  toggleNotifications: (type: keyof AppSettings['notifications']) => void

  // Loading and error states
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void

  // Validation
  validateSettings: (settings: Partial<AppSettings>) => boolean
  validateShortcuts: (shortcuts: Partial<KeyboardShortcuts>) => boolean

  // Save state management
  setSaveState: (hasChanges: boolean) => void
  saveSettings: () => Promise<void>
  discardChanges: () => void

  // Utility
  getSettingByPath: (path: string) => any
  setSettingByPath: (path: string, value: any) => void
}

const defaultSettings: AppSettings = {
  theme: 'system',
  accentColor: '#3b82f6',
  fontSize: 'medium',
  compactMode: false,
  showSidebar: true,
  sidebarCollapsed: false,

  language: 'ja',
  timezone: 'Asia/Tokyo',
  dateFormat: 'YYYY/MM/DD',
  timeFormat: '24h',
  weekStartsOn: 1, // Monday

  notifications: {
    enabled: true,
    sound: true,
    desktop: true,
    email: false,
    taskReminders: true,
    pomodoroAlerts: true,
    breakReminders: true,
    dailySummary: false,
  },

  tasks: {
    defaultPriority: 'MEDIUM',
    autoArchiveCompleted: false,
    autoArchiveDays: 30,
    showSubtasks: true,
    showProjectColors: true,
    enableDragDrop: true,
    confirmDelete: true,
    enableQuickAdd: true,
  },

  projects: {
    showInactive: false,
    defaultView: 'list',
    autoColorize: true,
  },

  sync: {
    enabled: true,
    autoSync: true,
    syncInterval: 5,
    conflictResolution: 'manual',
    offlineMode: false,
  },

  privacy: {
    analytics: false,
    crashReporting: true,
    usageStats: false,
    shareData: false,
  },

  experimental: {
    enableFeatureX: false,
    enableFeatureY: false,
  },
}

const defaultShortcuts: KeyboardShortcuts = {
  // グローバル
  toggleTheme: 'mod+shift+t',
  toggleSidebar: 'mod+b',
  quickSearch: 'mod+k',
  quickAdd: 'mod+shift+a',

  // タスク
  createTask: 'mod+n',
  editTask: 'mod+e',
  deleteTask: 'mod+backspace',
  toggleComplete: 'mod+enter',
  markImportant: 'mod+i',

  // タイマー
  startTimer: 'space',
  pauseTimer: 'space',
  stopTimer: 'mod+space',
  skipBreak: 'escape',

  // ナビゲーション
  goToTasks: 'mod+1',
  goToTimer: 'mod+2',
  goToReports: 'mod+3',
  goToSettings: 'mod+,',
}

const initialState = {
  settings: defaultSettings,
  shortcuts: defaultShortcuts,
  isLoading: false,
  error: null,
  hasUnsavedChanges: false,
}

export const useSettingsStore = create<SettingsState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialState,

        // Main settings updates
        updateSettings: (newSettings) =>
          set((state) => {
            if (!state.validateSettings(newSettings)) {
              return { error: '設定の値が無効です' }
            }

            return {
              settings: { ...state.settings, ...newSettings },
              hasUnsavedChanges: true,
              error: null,
            }
          }),

        updateShortcuts: (newShortcuts) =>
          set((state) => {
            if (!state.validateShortcuts(newShortcuts)) {
              return { error: 'ショートカットの設定が無効です' }
            }

            return {
              shortcuts: { ...state.shortcuts, ...newShortcuts },
              hasUnsavedChanges: true,
              error: null,
            }
          }),

        resetSettings: () =>
          set({
            settings: defaultSettings,
            hasUnsavedChanges: true,
            error: null,
          }),

        resetShortcuts: () =>
          set({
            shortcuts: defaultShortcuts,
            hasUnsavedChanges: true,
            error: null,
          }),

        importSettings: async (settingsData) => {
          try {
            const parsed = JSON.parse(settingsData)

            // 設定の検証
            if (parsed.settings && get().validateSettings(parsed.settings)) {
              set((state) => ({
                settings: { ...defaultSettings, ...parsed.settings },
                hasUnsavedChanges: true,
              }))
            }

            // ショートカットの検証
            if (parsed.shortcuts && get().validateShortcuts(parsed.shortcuts)) {
              set((state) => ({
                shortcuts: { ...defaultShortcuts, ...parsed.shortcuts },
                hasUnsavedChanges: true,
              }))
            }
          } catch (error) {
            set({ error: '設定ファイルの読み込みに失敗しました' })
          }
        },

        exportSettings: () => {
          const { settings, shortcuts } = get()
          return JSON.stringify({ settings, shortcuts }, null, 2)
        },

        // Individual setting updates
        setTheme: (theme) =>
          set((state) => ({
            settings: { ...state.settings, theme },
            hasUnsavedChanges: true,
          })),

        setLanguage: (language) =>
          set((state) => ({
            settings: { ...state.settings, language },
            hasUnsavedChanges: true,
          })),

        toggleSidebar: () =>
          set((state) => ({
            settings: {
              ...state.settings,
              showSidebar: !state.settings.showSidebar,
            },
            hasUnsavedChanges: true,
          })),

        toggleCompactMode: () =>
          set((state) => ({
            settings: {
              ...state.settings,
              compactMode: !state.settings.compactMode,
            },
            hasUnsavedChanges: true,
          })),

        toggleNotifications: (type) =>
          set((state) => ({
            settings: {
              ...state.settings,
              notifications: {
                ...state.settings.notifications,
                [type]: !state.settings.notifications[type],
              },
            },
            hasUnsavedChanges: true,
          })),

        // Loading and error states
        setLoading: (loading) =>
          set({ isLoading: loading }),

        setError: (error) =>
          set({ error }),

        clearError: () =>
          set({ error: null }),

        // Validation
        validateSettings: (settings) => {
          try {
            // 基本的な型チェック
            if (settings.theme && !['light', 'dark', 'system'].includes(settings.theme)) {
              return false
            }

            if (settings.language && !['ja', 'en'].includes(settings.language)) {
              return false
            }

            if (settings.fontSize && !['small', 'medium', 'large'].includes(settings.fontSize)) {
              return false
            }

            // 数値の範囲チェック
            if (settings.sync?.syncInterval && (settings.sync.syncInterval < 1 || settings.sync.syncInterval > 60)) {
              return false
            }

            if (settings.tasks?.autoArchiveDays && (settings.tasks.autoArchiveDays < 1 || settings.tasks.autoArchiveDays > 365)) {
              return false
            }

            return true
          } catch {
            return false
          }
        },

        validateShortcuts: (shortcuts) => {
          try {
            // 重複チェック
            const values = Object.values(shortcuts)
            const uniqueValues = new Set(values)

            if (values.length !== uniqueValues.size) {
              return false // 重複あり
            }

            // ショートカット形式の基本チェック
            for (const shortcut of values) {
              if (typeof shortcut !== 'string' || shortcut.length === 0) {
                return false
              }
            }

            return true
          } catch {
            return false
          }
        },

        // Save state management
        setSaveState: (hasChanges) =>
          set({ hasUnsavedChanges: hasChanges }),

        saveSettings: async () => {
          set({ isLoading: true, error: null })

          try {
            // ここで実際のAPI呼び出しやローカルストレージへの保存を行う
            // この例では単純に保存済み状態にする
            await new Promise(resolve => setTimeout(resolve, 500)) // 模擬的な遅延

            set({ hasUnsavedChanges: false, isLoading: false })
          } catch (error) {
            set({
              error: '設定の保存に失敗しました',
              isLoading: false,
            })
          }
        },

        discardChanges: () =>
          set((state) => ({
            settings: defaultSettings,
            shortcuts: defaultShortcuts,
            hasUnsavedChanges: false,
            error: null,
          })),

        // Utility functions
        getSettingByPath: (path) => {
          const { settings } = get()
          return path.split('.').reduce((obj, key) => obj?.[key], settings)
        },

        setSettingByPath: (path, value) => {
          set((state) => {
            const pathArray = path.split('.')
            const lastKey = pathArray.pop()!

            let target = state.settings
            for (const key of pathArray) {
              target = target[key as keyof AppSettings] as any
            }

            const newSettings = { ...state.settings }
            let newTarget = newSettings
            for (const key of pathArray) {
              newTarget = newTarget[key as keyof AppSettings] = {
                ...newTarget[key as keyof AppSettings]
              } as any
            }
            (newTarget as any)[lastKey] = value

            return {
              settings: newSettings,
              hasUnsavedChanges: true,
            }
          })
        },
      }),
      {
        name: 'settings-store',
        partialize: (state) => ({
          settings: state.settings,
          shortcuts: state.shortcuts,
        }),
      }
    )
  )
)

// セレクタ関数
export const useTheme = () => {
  return useSettingsStore((state) => state.settings.theme)
}

export const useLanguage = () => {
  return useSettingsStore((state) => state.settings.language)
}

export const useNotificationSettings = () => {
  return useSettingsStore((state) => state.settings.notifications)
}

export const useTaskSettings = () => {
  return useSettingsStore((state) => state.settings.tasks)
}

export const useAppearanceSettings = () => {
  return useSettingsStore((state) => ({
    theme: state.settings.theme,
    accentColor: state.settings.accentColor,
    fontSize: state.settings.fontSize,
    compactMode: state.settings.compactMode,
    showSidebar: state.settings.showSidebar,
    sidebarCollapsed: state.settings.sidebarCollapsed,
  }))
}

export const useKeyboardShortcuts = () => {
  return useSettingsStore((state) => state.shortcuts)
}
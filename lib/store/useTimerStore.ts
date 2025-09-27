'use client'

import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'

// タイマーの状態
export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed'

// タイマーの種類
export type TimerType = 'pomodoro' | 'short_break' | 'long_break' | 'custom'

// タイマー設定
export interface TimerSettings {
  pomodoroDuration: number // 分
  shortBreakDuration: number // 分
  longBreakDuration: number // 分
  longBreakInterval: number // ポモドーロ何回ごとに長い休憩
  autoStartBreaks: boolean
  autoStartPomodoros: boolean
  notificationSound: boolean
  notificationVolume: number // 0-100
  tickingSound: boolean
  tickingVolume: number // 0-100
}

// タイマーセッション
export interface TimerSession {
  id: string
  type: TimerType
  duration: number // 秒
  startTime: Date
  endTime?: Date
  taskId?: string
  completed: boolean
  paused?: boolean
  pausedDuration?: number // 一時停止の累計時間（秒）
}

// 統計情報
export interface TimerStats {
  totalSessions: number
  completedSessions: number
  totalFocusTime: number // 秒
  totalBreakTime: number // 秒
  averageSessionLength: number // 秒
  longestStreak: number // 連続完了セッション数
  currentStreak: number
  today: {
    sessions: number
    focusTime: number
    breakTime: number
  }
  thisWeek: {
    sessions: number
    focusTime: number
    breakTime: number
  }
}

interface TimerState {
  // Timer state
  status: TimerStatus
  type: TimerType
  timeLeft: number // 秒
  totalTime: number // 秒
  currentSession: TimerSession | null
  sessionHistory: TimerSession[]

  // Settings
  settings: TimerSettings

  // Statistics
  stats: TimerStats

  // Pomodoro cycle tracking
  currentCycle: number
  totalCycles: number

  // Error handling
  error: string | null

  // Actions
  startTimer: (type?: TimerType, duration?: number, taskId?: string) => void
  pauseTimer: () => void
  resumeTimer: () => void
  stopTimer: () => void
  resetTimer: () => void
  completeSession: () => void
  skipSession: () => void

  // Settings
  updateSettings: (settings: Partial<TimerSettings>) => void

  // Time manipulation
  setTimeLeft: (timeLeft: number) => void
  decrementTime: () => void

  // Session management
  addSession: (session: TimerSession) => void
  updateCurrentSession: (updates: Partial<TimerSession>) => void

  // Statistics
  updateStats: () => void
  resetStats: () => void

  // Cycle management
  nextCycle: () => TimerType
  resetCycle: () => void

  // Error handling
  setError: (error: string | null) => void

  // Utility
  getSessionDuration: (type: TimerType) => number
  getTodaysSessions: () => TimerSession[]
  getThisWeeksSessions: () => TimerSession[]

  // Reset
  reset: () => void
}

const defaultSettings: TimerSettings = {
  pomodoroDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  notificationSound: true,
  notificationVolume: 80,
  tickingSound: false,
  tickingVolume: 50,
}

const defaultStats: TimerStats = {
  totalSessions: 0,
  completedSessions: 0,
  totalFocusTime: 0,
  totalBreakTime: 0,
  averageSessionLength: 0,
  longestStreak: 0,
  currentStreak: 0,
  today: {
    sessions: 0,
    focusTime: 0,
    breakTime: 0,
  },
  thisWeek: {
    sessions: 0,
    focusTime: 0,
    breakTime: 0,
  },
}

const initialState = {
  status: 'idle' as TimerStatus,
  type: 'pomodoro' as TimerType,
  timeLeft: 25 * 60, // 25分をデフォルト
  totalTime: 25 * 60,
  currentSession: null,
  sessionHistory: [],
  settings: defaultSettings,
  stats: defaultStats,
  currentCycle: 0,
  totalCycles: 0,
  error: null,
}

export const useTimerStore = create<TimerState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialState,

        // Timer controls
        startTimer: (type, duration, taskId) => {
          const state = get()
          const timerType = type || state.type
          const timerDuration = duration || state.getSessionDuration(timerType)

          const session: TimerSession = {
            id: `session-${Date.now()}`,
            type: timerType,
            duration: timerDuration,
            startTime: new Date(),
            taskId,
            completed: false,
            paused: false,
            pausedDuration: 0,
          }

          set({
            status: 'running',
            type: timerType,
            timeLeft: timerDuration,
            totalTime: timerDuration,
            currentSession: session,
            error: null,
          })
        },

        pauseTimer: () => {
          const state = get()
          if (state.status === 'running' && state.currentSession) {
            set({
              status: 'paused',
              currentSession: {
                ...state.currentSession,
                paused: true,
              },
            })
          }
        },

        resumeTimer: () => {
          const state = get()
          if (state.status === 'paused' && state.currentSession) {
            set({
              status: 'running',
              currentSession: {
                ...state.currentSession,
                paused: false,
              },
            })
          }
        },

        stopTimer: () => {
          const state = get()
          if (state.currentSession && state.status !== 'idle') {
            const session = {
              ...state.currentSession,
              endTime: new Date(),
              completed: false,
            }

            set({
              status: 'idle',
              currentSession: null,
              sessionHistory: [...state.sessionHistory, session],
            })

            state.updateStats()
          }
        },

        resetTimer: () => {
          const state = get()
          const duration = state.getSessionDuration(state.type)

          set({
            status: 'idle',
            timeLeft: duration,
            totalTime: duration,
            currentSession: null,
            error: null,
          })
        },

        completeSession: () => {
          const state = get()
          if (state.currentSession) {
            const session = {
              ...state.currentSession,
              endTime: new Date(),
              completed: true,
            }

            set({
              status: 'completed',
              currentSession: null,
              sessionHistory: [...state.sessionHistory, session],
              currentCycle: state.type === 'pomodoro' ? state.currentCycle + 1 : state.currentCycle,
              totalCycles: state.type === 'pomodoro' ? state.totalCycles + 1 : state.totalCycles,
            })

            state.updateStats()
          }
        },

        skipSession: () => {
          const state = get()
          const nextType = state.nextCycle()
          const duration = state.getSessionDuration(nextType)

          set({
            status: 'idle',
            type: nextType,
            timeLeft: duration,
            totalTime: duration,
            currentSession: null,
          })
        },

        // Settings
        updateSettings: (settings) =>
          set((state) => {
            const newSettings = { ...state.settings, ...settings }
            const duration = state.getSessionDuration(state.type)

            return {
              settings: newSettings,
              timeLeft: state.status === 'idle' ? duration : state.timeLeft,
              totalTime: state.status === 'idle' ? duration : state.totalTime,
            }
          }),

        // Time manipulation
        setTimeLeft: (timeLeft) =>
          set({ timeLeft }),

        decrementTime: () =>
          set((state) => {
            const newTimeLeft = Math.max(0, state.timeLeft - 1)

            if (newTimeLeft === 0 && state.status === 'running') {
              // タイマー完了
              state.completeSession()
            }

            return { timeLeft: newTimeLeft }
          }),

        // Session management
        addSession: (session) =>
          set((state) => ({
            sessionHistory: [...state.sessionHistory, session],
          })),

        updateCurrentSession: (updates) =>
          set((state) => ({
            currentSession: state.currentSession
              ? { ...state.currentSession, ...updates }
              : null,
          })),

        // Statistics
        updateStats: () => {
          const state = get()
          const sessions = state.sessionHistory
          const today = new Date()
          const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay())

          const todaysSessions = sessions.filter(s => {
            const sessionDate = new Date(s.startTime)
            return sessionDate.toDateString() === today.toDateString()
          })

          const thisWeeksSessions = sessions.filter(s => {
            const sessionDate = new Date(s.startTime)
            return sessionDate >= weekStart
          })

          const completedSessions = sessions.filter(s => s.completed)
          const totalFocusTime = sessions
            .filter(s => s.type === 'pomodoro' && s.completed)
            .reduce((total, s) => total + s.duration, 0)
          const totalBreakTime = sessions
            .filter(s => s.type !== 'pomodoro' && s.completed)
            .reduce((total, s) => total + s.duration, 0)

          // 連続完了ストリークを計算
          let currentStreak = 0
          let longestStreak = 0
          let tempStreak = 0

          const sortedSessions = [...sessions]
            .filter(s => s.type === 'pomodoro')
            .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())

          for (const session of sortedSessions) {
            if (session.completed) {
              tempStreak++
              if (tempStreak === 1) currentStreak = tempStreak
            } else {
              longestStreak = Math.max(longestStreak, tempStreak)
              tempStreak = 0
              if (currentStreak === 0) break
            }
          }
          longestStreak = Math.max(longestStreak, tempStreak)

          const stats: TimerStats = {
            totalSessions: sessions.length,
            completedSessions: completedSessions.length,
            totalFocusTime,
            totalBreakTime,
            averageSessionLength: completedSessions.length > 0
              ? completedSessions.reduce((total, s) => total + s.duration, 0) / completedSessions.length
              : 0,
            longestStreak,
            currentStreak,
            today: {
              sessions: todaysSessions.length,
              focusTime: todaysSessions
                .filter(s => s.type === 'pomodoro' && s.completed)
                .reduce((total, s) => total + s.duration, 0),
              breakTime: todaysSessions
                .filter(s => s.type !== 'pomodoro' && s.completed)
                .reduce((total, s) => total + s.duration, 0),
            },
            thisWeek: {
              sessions: thisWeeksSessions.length,
              focusTime: thisWeeksSessions
                .filter(s => s.type === 'pomodoro' && s.completed)
                .reduce((total, s) => total + s.duration, 0),
              breakTime: thisWeeksSessions
                .filter(s => s.type !== 'pomodoro' && s.completed)
                .reduce((total, s) => total + s.duration, 0),
            },
          }

          set({ stats })
        },

        resetStats: () =>
          set({ stats: defaultStats, sessionHistory: [] }),

        // Cycle management
        nextCycle: () => {
          const state = get()

          if (state.type === 'pomodoro') {
            // ポモドーロ完了後
            if ((state.currentCycle + 1) % state.settings.longBreakInterval === 0) {
              return 'long_break'
            } else {
              return 'short_break'
            }
          } else {
            // 休憩完了後
            return 'pomodoro'
          }
        },

        resetCycle: () =>
          set({ currentCycle: 0, totalCycles: 0 }),

        // Error handling
        setError: (error) =>
          set({ error }),

        // Utility functions
        getSessionDuration: (type) => {
          const { settings } = get()
          switch (type) {
            case 'pomodoro':
              return settings.pomodoroDuration * 60
            case 'short_break':
              return settings.shortBreakDuration * 60
            case 'long_break':
              return settings.longBreakDuration * 60
            default:
              return 25 * 60 // デフォルト
          }
        },

        getTodaysSessions: () => {
          const { sessionHistory } = get()
          const today = new Date()
          return sessionHistory.filter(session => {
            const sessionDate = new Date(session.startTime)
            return sessionDate.toDateString() === today.toDateString()
          })
        },

        getThisWeeksSessions: () => {
          const { sessionHistory } = get()
          const today = new Date()
          const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay())
          return sessionHistory.filter(session => {
            const sessionDate = new Date(session.startTime)
            return sessionDate >= weekStart
          })
        },

        // Reset
        reset: () =>
          set(initialState),
      }),
      {
        name: 'timer-store',
        partialize: (state) => ({
          settings: state.settings,
          sessionHistory: state.sessionHistory,
          stats: state.stats,
          currentCycle: state.currentCycle,
          totalCycles: state.totalCycles,
        }),
      }
    )
  )
)

// セレクタ関数
export const useTimerStats = () => {
  return useTimerStore((state) => state.stats)
}

export const useTimerSettings = () => {
  return useTimerStore((state) => state.settings)
}

export const useCurrentSession = () => {
  return useTimerStore((state) => state.currentSession)
}

export const useTimerProgress = () => {
  return useTimerStore((state) => ({
    timeLeft: state.timeLeft,
    totalTime: state.totalTime,
    progress: state.totalTime > 0 ? ((state.totalTime - state.timeLeft) / state.totalTime) * 100 : 0,
  }))
}
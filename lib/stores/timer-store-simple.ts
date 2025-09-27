import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TimerMode = 'work' | 'short-break' | 'long-break'
export type TimerStatus = 'idle' | 'running' | 'paused'

interface TimerState {
  // Timer settings
  workDuration: number // in minutes
  shortBreakDuration: number
  longBreakDuration: number
  pomosUntilLongBreak: number

  // Timer state
  mode: TimerMode
  status: TimerStatus
  timeRemaining: number // in seconds
  completedPomos: number
  currentTaskId: string | null

  // Interval reference
  intervalId: NodeJS.Timeout | null

  // Actions
  startTimer: () => void
  pauseTimer: () => void
  resumeTimer: () => void
  resetTimer: () => void
  skipTimer: () => void
  setMode: (mode: TimerMode) => void
  setCurrentTask: (taskId: string | null) => void
  tick: () => void
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      // Default settings (in minutes)
      workDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      pomosUntilLongBreak: 4,

      // Initial state
      mode: 'work',
      status: 'idle',
      timeRemaining: 25 * 60, // 25 minutes in seconds
      completedPomos: 0,
      currentTaskId: null,
      intervalId: null,

      // Tick function - called every second when timer is running
      tick: () => {
        const state = get()
        if (state.timeRemaining <= 0) {
          // Timer completed
          clearInterval(state.intervalId!)

          // Play notification sound
          const audio = new Audio('/notification.mp3')
          audio.play().catch(console.error)

          // Handle completion based on mode
          if (state.mode === 'work') {
            const newCompletedPomos = state.completedPomos + 1
            set({ completedPomos: newCompletedPomos })

            // Determine next mode
            if (newCompletedPomos % state.pomosUntilLongBreak === 0) {
              set({
                mode: 'long-break',
                timeRemaining: state.longBreakDuration * 60,
                status: 'idle',
                intervalId: null
              })
            } else {
              set({
                mode: 'short-break',
                timeRemaining: state.shortBreakDuration * 60,
                status: 'idle',
                intervalId: null
              })
            }
          } else {
            // After break, go back to work
            set({
              mode: 'work',
              timeRemaining: state.workDuration * 60,
              status: 'idle',
              intervalId: null
            })
          }

          // Show notification
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('ポモドーロ完了！', {
              body: state.mode === 'work' ? '休憩時間です' : '作業を再開しましょう',
              icon: '/icon-192x192.png'
            })
          }
        } else {
          // Decrement timer
          set({ timeRemaining: state.timeRemaining - 1 })
        }
      },

      // Start timer
      startTimer: () => {
        const state = get()

        // Clear any existing interval
        if (state.intervalId) {
          clearInterval(state.intervalId)
        }

        // Start new interval
        const id = setInterval(() => {
          get().tick()
        }, 1000)

        set({
          status: 'running',
          intervalId: id
        })
      },

      // Pause timer
      pauseTimer: () => {
        const state = get()
        if (state.intervalId) {
          clearInterval(state.intervalId)
        }
        set({
          status: 'paused',
          intervalId: null
        })
      },

      // Resume timer
      resumeTimer: () => {
        get().startTimer()
      },

      // Reset timer
      resetTimer: () => {
        const state = get()

        // Clear interval
        if (state.intervalId) {
          clearInterval(state.intervalId)
        }

        const duration = state.mode === 'work'
          ? state.workDuration
          : state.mode === 'short-break'
          ? state.shortBreakDuration
          : state.longBreakDuration

        set({
          status: 'idle',
          timeRemaining: duration * 60,
          intervalId: null
        })
      },

      // Skip to next timer
      skipTimer: () => {
        const state = get()

        // Clear interval
        if (state.intervalId) {
          clearInterval(state.intervalId)
        }

        if (state.mode === 'work') {
          const newCompletedPomos = state.completedPomos + 1
          set({ completedPomos: newCompletedPomos })

          if (newCompletedPomos % state.pomosUntilLongBreak === 0) {
            set({
              mode: 'long-break',
              timeRemaining: state.longBreakDuration * 60,
              status: 'idle',
              intervalId: null
            })
          } else {
            set({
              mode: 'short-break',
              timeRemaining: state.shortBreakDuration * 60,
              status: 'idle',
              intervalId: null
            })
          }
        } else {
          set({
            mode: 'work',
            timeRemaining: state.workDuration * 60,
            status: 'idle',
            intervalId: null
          })
        }
      },

      // Set timer mode
      setMode: (mode: TimerMode) => {
        const state = get()

        // Clear interval if running
        if (state.intervalId) {
          clearInterval(state.intervalId)
        }

        const duration = mode === 'work'
          ? state.workDuration
          : mode === 'short-break'
          ? state.shortBreakDuration
          : state.longBreakDuration

        set({
          mode,
          timeRemaining: duration * 60,
          status: 'idle',
          intervalId: null
        })
      },

      // Set current task
      setCurrentTask: (taskId: string | null) => {
        set({ currentTaskId: taskId })
      }
    }),
    {
      name: 'timer-storage',
      partialize: (state) => ({
        workDuration: state.workDuration,
        shortBreakDuration: state.shortBreakDuration,
        longBreakDuration: state.longBreakDuration,
        pomosUntilLongBreak: state.pomosUntilLongBreak,
        completedPomos: state.completedPomos,
        currentTaskId: state.currentTaskId,
        mode: state.mode,
        timeRemaining: state.timeRemaining
      })
    }
  )
)
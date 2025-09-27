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

  // Worker reference
  worker: Worker | null

  // Actions
  startTimer: () => void
  pauseTimer: () => void
  resumeTimer: () => void
  resetTimer: () => void
  skipTimer: () => void
  setMode: (mode: TimerMode) => void
  setCurrentTask: (taskId: string | null) => void
  updateTimeRemaining: (time: number) => void
  incrementCompletedPomos: () => void
  initializeWorker: () => void
  cleanupWorker: () => void
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
      worker: null,

      // Initialize Web Worker
      initializeWorker: () => {
        const state = get()
        if (state.worker) return

        try {
          const worker = new Worker('/workers/timer-worker.js')

        worker.onmessage = (e) => {
          if (e.data.type === 'tick') {
            set({ timeRemaining: e.data.timeRemaining })
          } else if (e.data.type === 'complete') {
            const state = get()

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
                  status: 'idle'
                })
              } else {
                set({
                  mode: 'short-break',
                  timeRemaining: state.shortBreakDuration * 60,
                  status: 'idle'
                })
              }
            } else {
              // After break, go back to work
              set({
                mode: 'work',
                timeRemaining: state.workDuration * 60,
                status: 'idle'
              })
            }

            // Show notification
            if (Notification.permission === 'granted') {
              new Notification('ポモドーロ完了！', {
                body: state.mode === 'work' ? '休憩時間です' : '作業を再開しましょう',
                icon: '/icon-192x192.png'
              })
            }
          }
        }

        set({ worker })
        } catch (error) {
          console.error('Failed to initialize Web Worker:', error)
        }
      },

      // Cleanup worker
      cleanupWorker: () => {
        const state = get()
        if (state.worker) {
          state.worker.terminate()
          set({ worker: null })
        }
      },

      // Start timer
      startTimer: () => {
        const state = get()
        if (!state.worker) {
          get().initializeWorker()
        }

        const worker = get().worker
        if (worker) {
          worker.postMessage({
            type: 'start',
            duration: state.timeRemaining
          })
          set({ status: 'running' })
        }
      },

      // Pause timer
      pauseTimer: () => {
        const state = get()
        if (state.worker) {
          state.worker.postMessage({ type: 'pause' })
          set({ status: 'paused' })
        }
      },

      // Resume timer
      resumeTimer: () => {
        const state = get()
        if (state.worker) {
          state.worker.postMessage({
            type: 'resume',
            duration: state.timeRemaining
          })
          set({ status: 'running' })
        }
      },

      // Reset timer
      resetTimer: () => {
        const state = get()
        if (state.worker) {
          state.worker.postMessage({ type: 'reset' })
        }

        const duration = state.mode === 'work'
          ? state.workDuration
          : state.mode === 'short-break'
          ? state.shortBreakDuration
          : state.longBreakDuration

        set({
          status: 'idle',
          timeRemaining: duration * 60
        })
      },

      // Skip to next timer
      skipTimer: () => {
        const state = get()
        if (state.worker) {
          state.worker.postMessage({ type: 'reset' })
        }

        if (state.mode === 'work') {
          const newCompletedPomos = state.completedPomos + 1
          set({ completedPomos: newCompletedPomos })

          if (newCompletedPomos % state.pomosUntilLongBreak === 0) {
            set({
              mode: 'long-break',
              timeRemaining: state.longBreakDuration * 60,
              status: 'idle'
            })
          } else {
            set({
              mode: 'short-break',
              timeRemaining: state.shortBreakDuration * 60,
              status: 'idle'
            })
          }
        } else {
          set({
            mode: 'work',
            timeRemaining: state.workDuration * 60,
            status: 'idle'
          })
        }
      },

      // Set timer mode
      setMode: (mode: TimerMode) => {
        const state = get()
        const duration = mode === 'work'
          ? state.workDuration
          : mode === 'short-break'
          ? state.shortBreakDuration
          : state.longBreakDuration

        set({
          mode,
          timeRemaining: duration * 60,
          status: 'idle'
        })
      },

      // Set current task
      setCurrentTask: (taskId: string | null) => {
        set({ currentTaskId: taskId })
      },

      // Update time remaining
      updateTimeRemaining: (time: number) => {
        set({ timeRemaining: time })
      },

      // Increment completed pomodoros
      incrementCompletedPomos: () => {
        set(state => ({ completedPomos: state.completedPomos + 1 }))
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
        timeRemaining: state.timeRemaining,
        status: state.status
      })
    }
  )
)
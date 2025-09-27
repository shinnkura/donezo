'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useTimerStore } from '@/lib/store/useTimerStore'

// Worker メッセージの型定義
interface TimerMessage {
  type: 'start' | 'pause' | 'resume' | 'stop' | 'reset' | 'sync'
  duration?: number
  currentTime?: number
}

interface TimerResponse {
  type: 'tick' | 'complete' | 'paused' | 'resumed' | 'stopped' | 'reset' | 'sync' | 'ready' | 'error'
  currentTime: number
  isRunning: boolean
  isPaused: boolean
  error?: string
}

interface UseTimerWorkerOptions {
  onTick?: (timeLeft: number) => void
  onComplete?: () => void
  onError?: (error: string) => void
  enableVisibilitySync?: boolean
}

export function useTimerWorker(options: UseTimerWorkerOptions = {}) {
  const {
    onTick,
    onComplete,
    onError,
    enableVisibilitySync = true,
  } = options

  const workerRef = useRef<Worker | null>(null)
  const [isWorkerReady, setIsWorkerReady] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Zustand store のアクション
  const {
    setTimeLeft,
    setError: setStoreError,
    completeSession,
    status,
    timeLeft,
  } = useTimerStore()

  // Worker の初期化
  useEffect(() => {
    // Worker サポートチェック
    if (typeof Worker === 'undefined') {
      setIsSupported(false)
      setError('Web Workers are not supported in this environment')
      return
    }

    setIsSupported(true)

    try {
      // Worker を作成
      workerRef.current = new Worker(
        new URL('./timer.worker.ts', import.meta.url),
        { type: 'module' }
      )

      // メッセージハンドラーを設定
      workerRef.current.onmessage = (event: MessageEvent<TimerResponse>) => {
        const { type, currentTime, isRunning, isPaused, error: workerError } = event.data

        switch (type) {
          case 'ready':
            setIsWorkerReady(true)
            break

          case 'tick':
            setTimeLeft(currentTime)
            onTick?.(currentTime)
            break

          case 'complete':
            setTimeLeft(0)
            completeSession()
            onComplete?.()
            break

          case 'paused':
            setTimeLeft(currentTime)
            break

          case 'resumed':
            setTimeLeft(currentTime)
            break

          case 'stopped':
            setTimeLeft(currentTime)
            break

          case 'reset':
            setTimeLeft(0)
            break

          case 'sync':
            setTimeLeft(currentTime)
            break

          case 'error':
            const errorMessage = workerError || 'Timer worker error occurred'
            setError(errorMessage)
            setStoreError(errorMessage)
            onError?.(errorMessage)
            break
        }
      }

      // エラーハンドラーを設定
      workerRef.current.onerror = (error) => {
        const errorMessage = `Worker error: ${error.message}`
        setError(errorMessage)
        setStoreError(errorMessage)
        onError?.(errorMessage)
      }

      // 終了処理
      return () => {
        if (workerRef.current) {
          workerRef.current.terminate()
          workerRef.current = null
        }
        setIsWorkerReady(false)
      }
    } catch (err) {
      const errorMessage = `Failed to create worker: ${err instanceof Error ? err.message : 'Unknown error'}`
      setError(errorMessage)
      setStoreError(errorMessage)
      onError?.(errorMessage)
    }
  }, [onTick, onComplete, onError, setTimeLeft, setStoreError, completeSession])

  // Page Visibility API の監視
  useEffect(() => {
    if (!enableVisibilitySync || !isWorkerReady) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // ページが非表示になったとき
        syncTimer()
      } else {
        // ページが表示されたとき
        syncTimer()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enableVisibilitySync, isWorkerReady])

  // Worker にメッセージを送信する関数
  const sendMessage = useCallback((message: TimerMessage) => {
    if (!workerRef.current || !isWorkerReady) {
      console.warn('Worker is not ready')
      return false
    }

    try {
      workerRef.current.postMessage(message)
      return true
    } catch (err) {
      const errorMessage = `Failed to send message to worker: ${err instanceof Error ? err.message : 'Unknown error'}`
      setError(errorMessage)
      setStoreError(errorMessage)
      onError?.(errorMessage)
      return false
    }
  }, [isWorkerReady, setStoreError, onError])

  // タイマー開始
  const startTimer = useCallback((duration: number) => {
    return sendMessage({
      type: 'start',
      duration,
    })
  }, [sendMessage])

  // タイマー一時停止
  const pauseTimer = useCallback(() => {
    return sendMessage({
      type: 'pause',
    })
  }, [sendMessage])

  // タイマー再開
  const resumeTimer = useCallback(() => {
    return sendMessage({
      type: 'resume',
    })
  }, [sendMessage])

  // タイマー停止
  const stopTimer = useCallback(() => {
    return sendMessage({
      type: 'stop',
    })
  }, [sendMessage])

  // タイマーリセット
  const resetTimer = useCallback(() => {
    return sendMessage({
      type: 'reset',
    })
  }, [sendMessage])

  // タイマー同期
  const syncTimer = useCallback(() => {
    return sendMessage({
      type: 'sync',
      currentTime: timeLeft,
    })
  }, [sendMessage, timeLeft])

  // フォーカス取得時の自動同期
  useEffect(() => {
    const handleFocus = () => {
      if (status === 'running') {
        syncTimer()
      }
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [status, syncTimer])

  // ブラウザタブの非アクティブ時間を考慮した同期
  const [lastActiveTime, setLastActiveTime] = useState(Date.now())

  useEffect(() => {
    const updateActiveTime = () => {
      setLastActiveTime(Date.now())
    }

    // ユーザーのアクティビティを監視
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']

    events.forEach(event => {
      document.addEventListener(event, updateActiveTime, { passive: true })
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActiveTime)
      })
    }
  }, [])

  // 長時間非アクティブ後の復帰時に同期
  useEffect(() => {
    const checkInactivity = () => {
      const now = Date.now()
      const inactiveTime = now - lastActiveTime

      // 5分以上非アクティブだった場合、同期を実行
      if (inactiveTime > 5 * 60 * 1000 && status === 'running') {
        syncTimer()
      }
    }

    const interval = setInterval(checkInactivity, 30000) // 30秒ごとにチェック

    return () => clearInterval(interval)
  }, [lastActiveTime, status, syncTimer])

  // Worker の健全性チェック
  const checkWorkerHealth = useCallback(() => {
    if (!isWorkerReady || !workerRef.current) {
      return false
    }

    try {
      // 簡単な ping メッセージを送信
      syncTimer()
      return true
    } catch (err) {
      return false
    }
  }, [isWorkerReady, syncTimer])

  // デバッグ用の Worker 状態情報
  const getWorkerInfo = useCallback(() => {
    return {
      isSupported,
      isWorkerReady,
      error,
      lastActiveTime,
      hasWorker: !!workerRef.current,
    }
  }, [isSupported, isWorkerReady, error, lastActiveTime])

  return {
    // Worker の状態
    isSupported,
    isWorkerReady,
    error,

    // タイマー制御関数
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    syncTimer,

    // ユーティリティ関数
    checkWorkerHealth,
    getWorkerInfo,

    // 低レベル関数
    sendMessage,
  }
}

// Timer Worker との統合を簡単にするためのヘルパーフック
export function useTimerWorkerIntegration() {
  const {
    startTimer: storeStartTimer,
    pauseTimer: storePauseTimer,
    resumeTimer: storeResumeTimer,
    stopTimer: storeStopTimer,
    resetTimer: storeResetTimer,
    status,
    timeLeft,
    totalTime,
    type,
    getSessionDuration,
  } = useTimerStore()

  const workerActions = useTimerWorker({
    onComplete: () => {
      // タイマー完了時の処理はZustandで管理
    },
    onError: (error) => {
      console.error('Timer worker error:', error)
    },
  })

  // Zustand と Worker を統合したアクション
  const startIntegratedTimer = useCallback((timerType?: string, duration?: number, taskId?: string) => {
    const sessionDuration = duration || getSessionDuration(type)

    // Zustand store でセッション開始
    storeStartTimer(timerType as any, sessionDuration, taskId)

    // Worker でタイマー開始
    workerActions.startTimer(sessionDuration)
  }, [storeStartTimer, getSessionDuration, type, workerActions])

  const pauseIntegratedTimer = useCallback(() => {
    storePauseTimer()
    workerActions.pauseTimer()
  }, [storePauseTimer, workerActions])

  const resumeIntegratedTimer = useCallback(() => {
    storeResumeTimer()
    workerActions.resumeTimer()
  }, [storeResumeTimer, workerActions])

  const stopIntegratedTimer = useCallback(() => {
    storeStopTimer()
    workerActions.stopTimer()
  }, [storeStopTimer, workerActions])

  const resetIntegratedTimer = useCallback(() => {
    storeResetTimer()
    workerActions.resetTimer()
  }, [storeResetTimer, workerActions])

  return {
    ...workerActions,

    // 統合されたアクション
    startTimer: startIntegratedTimer,
    pauseTimer: pauseIntegratedTimer,
    resumeTimer: resumeIntegratedTimer,
    stopTimer: stopIntegratedTimer,
    resetTimer: resetIntegratedTimer,

    // ストアの状態
    status,
    timeLeft,
    totalTime,
    type,
  }
}
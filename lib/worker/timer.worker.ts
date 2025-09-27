/// <reference lib="webworker" />

// タイマーワーカーのメッセージタイプ
interface TimerMessage {
  type: 'start' | 'pause' | 'resume' | 'stop' | 'reset' | 'sync'
  duration?: number
  currentTime?: number
}

interface TimerResponse {
  type: 'tick' | 'complete' | 'paused' | 'resumed' | 'stopped' | 'reset' | 'sync'
  currentTime: number
  isRunning: boolean
  isPaused: boolean
}

// ワーカーの状態
let timerId: number | null = null
let startTime: number = 0
let pausedTime: number = 0
let totalPausedDuration: number = 0
let duration: number = 0
let isRunning: boolean = false
let isPaused: boolean = false

// 高精度タイマー関数
function startHighPrecisionTimer() {
  const tick = () => {
    if (!isRunning || isPaused) {
      return
    }

    const now = Date.now()
    const elapsed = now - startTime - totalPausedDuration
    const remaining = duration - elapsed

    if (remaining <= 0) {
      // タイマー完了
      isRunning = false
      isPaused = false

      const response: TimerResponse = {
        type: 'complete',
        currentTime: 0,
        isRunning: false,
        isPaused: false,
      }

      self.postMessage(response)
      return
    }

    // 残り時間を送信（秒単位）
    const response: TimerResponse = {
      type: 'tick',
      currentTime: Math.ceil(remaining / 1000),
      isRunning: true,
      isPaused: false,
    }

    self.postMessage(response)

    // 次のティックをスケジュール（より正確な間隔で）
    const nextTick = 1000 - (elapsed % 1000)
    timerId = self.setTimeout(tick, Math.max(nextTick, 10))
  }

  tick()
}

// タイマー停止
function stopTimer() {
  if (timerId) {
    clearTimeout(timerId)
    timerId = null
  }
  isRunning = false
  isPaused = false
  startTime = 0
  pausedTime = 0
  totalPausedDuration = 0
}

// メッセージハンドラー
self.addEventListener('message', (event: MessageEvent<TimerMessage>) => {
  const { type, duration: newDuration, currentTime } = event.data

  switch (type) {
    case 'start':
      if (newDuration) {
        duration = newDuration * 1000 // 秒をミリ秒に変換
        startTime = Date.now()
        totalPausedDuration = 0
        isRunning = true
        isPaused = false

        startHighPrecisionTimer()

        const response: TimerResponse = {
          type: 'tick',
          currentTime: newDuration,
          isRunning: true,
          isPaused: false,
        }

        self.postMessage(response)
      }
      break

    case 'pause':
      if (isRunning && !isPaused) {
        isPaused = true
        pausedTime = Date.now()

        if (timerId) {
          clearTimeout(timerId)
          timerId = null
        }

        const now = Date.now()
        const elapsed = now - startTime - totalPausedDuration
        const remaining = duration - elapsed

        const response: TimerResponse = {
          type: 'paused',
          currentTime: Math.ceil(remaining / 1000),
          isRunning: true,
          isPaused: true,
        }

        self.postMessage(response)
      }
      break

    case 'resume':
      if (isRunning && isPaused) {
        const now = Date.now()
        totalPausedDuration += now - pausedTime
        isPaused = false
        pausedTime = 0

        startHighPrecisionTimer()

        const elapsed = now - startTime - totalPausedDuration
        const remaining = duration - elapsed

        const response: TimerResponse = {
          type: 'resumed',
          currentTime: Math.ceil(remaining / 1000),
          isRunning: true,
          isPaused: false,
        }

        self.postMessage(response)
      }
      break

    case 'stop':
      stopTimer()

      const stopResponse: TimerResponse = {
        type: 'stopped',
        currentTime: 0,
        isRunning: false,
        isPaused: false,
      }

      self.postMessage(stopResponse)
      break

    case 'reset':
      stopTimer()

      const resetResponse: TimerResponse = {
        type: 'reset',
        currentTime: 0,
        isRunning: false,
        isPaused: false,
      }

      self.postMessage(resetResponse)
      break

    case 'sync':
      // 現在の状態を同期
      if (isRunning) {
        const now = Date.now()
        let remaining: number

        if (isPaused) {
          const elapsed = pausedTime - startTime - totalPausedDuration
          remaining = duration - elapsed
        } else {
          const elapsed = now - startTime - totalPausedDuration
          remaining = duration - elapsed
        }

        const syncResponse: TimerResponse = {
          type: 'sync',
          currentTime: Math.max(0, Math.ceil(remaining / 1000)),
          isRunning: true,
          isPaused,
        }

        self.postMessage(syncResponse)
      } else {
        const syncResponse: TimerResponse = {
          type: 'sync',
          currentTime: currentTime || 0,
          isRunning: false,
          isPaused: false,
        }

        self.postMessage(syncResponse)
      }
      break
  }
})

// ワーカーの初期化メッセージ
self.postMessage({
  type: 'ready',
  currentTime: 0,
  isRunning: false,
  isPaused: false,
})

// Page Visibility API のイベントを監視
// ページが非表示になったときも正確な時間を保持
self.addEventListener('visibilitychange', () => {
  if (isRunning) {
    // 同期メッセージを送信
    const event: TimerMessage = {
      type: 'sync',
    }

    // 内部で同期処理を実行
    if (isRunning) {
      const now = Date.now()
      let remaining: number

      if (isPaused) {
        const elapsed = pausedTime - startTime - totalPausedDuration
        remaining = duration - elapsed
      } else {
        const elapsed = now - startTime - totalPausedDuration
        remaining = duration - elapsed
      }

      const syncResponse: TimerResponse = {
        type: 'sync',
        currentTime: Math.max(0, Math.ceil(remaining / 1000)),
        isRunning: true,
        isPaused,
      }

      self.postMessage(syncResponse)
    }
  }
})

// エラーハンドリング
self.addEventListener('error', (error) => {
  console.error('Timer Worker Error:', error)
  stopTimer()

  self.postMessage({
    type: 'error',
    error: error.message,
    currentTime: 0,
    isRunning: false,
    isPaused: false,
  })
})

// 未処理のPromise rejection をキャッチ
self.addEventListener('unhandledrejection', (event) => {
  console.error('Timer Worker Unhandled Rejection:', event.reason)
  event.preventDefault()
})

export {} // TypeScript モジュールとして認識させるため
'use client'

import { useEffect } from 'react'
import { useTimerStore } from '@/lib/stores/timer-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play, Pause, Brain, Coffee } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function GlobalTimer() {
  const {
    mode,
    status,
    timeRemaining,
    startTimer,
    pauseTimer,
    resumeTimer,
    initializeWorker
  } = useTimerStore()

  const router = useRouter()

  // Initialize worker on mount (only if not already initialized)
  useEffect(() => {
    if (status === 'idle') {
      initializeWorker()
    }
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getModeIcon = () => {
    return mode === 'work' ? <Brain className="h-4 w-4" /> : <Coffee className="h-4 w-4" />
  }

  const getModeLabel = () => {
    switch (mode) {
      case 'work':
        return 'ポモドーロ'
      case 'short-break':
        return 'ショートブレイク'
      case 'long-break':
        return 'ロングブレイク'
      default:
        return ''
    }
  }

  const handleTimerClick = () => {
    router.push('/timer')
  }

  // Don't show if timer is idle
  if (status === 'idle' && timeRemaining === 0) {
    return null
  }

  return (
    <div className="flex items-center space-x-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleTimerClick}
        className="flex items-center space-x-2"
      >
        {getModeIcon()}
        <span className="font-mono font-semibold">{formatTime(timeRemaining)}</span>
        <Badge variant={mode === 'work' ? 'destructive' : 'secondary'} className="ml-2">
          {getModeLabel()}
        </Badge>
      </Button>

      {status === 'running' ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={pauseTimer}
          className="h-8 w-8"
        >
          <Pause className="h-4 w-4" />
        </Button>
      ) : status === 'paused' ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={resumeTimer}
          className="h-8 w-8"
        >
          <Play className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          onClick={startTimer}
          className="h-8 w-8"
        >
          <Play className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
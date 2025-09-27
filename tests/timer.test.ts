import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTimerStore } from '@/lib/store/useTimerStore'

describe('Timer Store', () => {
  beforeEach(() => {
    useTimerStore.getState().reset()
    vi.clearAllMocks()
  })

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useTimerStore())

    expect(result.current.timeRemaining).toBe(25 * 60)
    expect(result.current.isRunning).toBe(false)
    expect(result.current.mode).toBe('FOCUS')
    expect(result.current.sessionCount).toBe(0)
  })

  it('should start timer', () => {
    const { result } = renderHook(() => useTimerStore())

    act(() => {
      result.current.start()
    })

    expect(result.current.isRunning).toBe(true)
  })

  it('should pause timer', () => {
    const { result } = renderHook(() => useTimerStore())

    act(() => {
      result.current.start()
      result.current.pause()
    })

    expect(result.current.isRunning).toBe(false)
  })

  it('should reset timer', () => {
    const { result } = renderHook(() => useTimerStore())

    act(() => {
      result.current.setTimeRemaining(10 * 60)
      result.current.reset()
    })

    expect(result.current.timeRemaining).toBe(25 * 60)
  })

  it('should switch modes correctly', () => {
    const { result } = renderHook(() => useTimerStore())

    act(() => {
      result.current.switchMode('SHORT_BREAK')
    })

    expect(result.current.mode).toBe('SHORT_BREAK')
    expect(result.current.timeRemaining).toBe(5 * 60)

    act(() => {
      result.current.switchMode('LONG_BREAK')
    })

    expect(result.current.mode).toBe('LONG_BREAK')
    expect(result.current.timeRemaining).toBe(15 * 60)
  })

  it('should handle continuous mode', () => {
    const { result } = renderHook(() => useTimerStore())

    act(() => {
      result.current.setContinuousMode(true)
    })

    expect(result.current.continuousMode).toBe(true)

    act(() => {
      result.current.completeSession()
    })

    expect(result.current.sessionCount).toBe(1)
    expect(result.current.mode).toBe('SHORT_BREAK')
  })

  it('should complete session and switch to long break after 4 sessions', () => {
    const { result } = renderHook(() => useTimerStore())

    act(() => {
      result.current.setContinuousMode(true)
      result.current.setSessionCount(3)
      result.current.completeSession()
    })

    expect(result.current.sessionCount).toBe(4)
    expect(result.current.mode).toBe('LONG_BREAK')
  })
})
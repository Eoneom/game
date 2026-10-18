import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseCountdownProgressParams {
  endAt?: number
  startAt?: number
  onDone?: () => void
  onTick?: () => void
  tickDuration?: number
}

export interface UseCountdownProgressResult {
  remainingSeconds: number
  elapsedProgress: number
  reset: () => void
}

export const useCountdownProgress = ({
  endAt,
  startAt,
  onDone,
  onTick,
  tickDuration
}: UseCountdownProgressParams): UseCountdownProgressResult => {
  const [remainingSeconds, setRemainingSeconds] = useState(() => {
    if (!endAt) {
      return 0
    }
    const ms = endAt - Date.now()
    return ms <= 0 ? 0 : Math.ceil(ms / 1000)
  })
  const [elapsedProgress, setElapsedProgress] = useState(() => {
    if (!endAt || startAt == null || endAt <= startAt) {
      return 0
    }
    const now = Date.now()
    return Math.min(1, Math.max(0, (now - startAt) / (endAt - startAt)))
  })

  const onDoneRef = useRef(onDone)
  const onTickRef = useRef(onTick)
  const lastTickSecondsRef = useRef(0)
  const completedRef = useRef(false)

  onDoneRef.current = onDone
  onTickRef.current = onTick

  const reset = useCallback(() => {
    setRemainingSeconds(0)
    setElapsedProgress(0)
    lastTickSecondsRef.current = 0
    completedRef.current = false
  }, [])

  useEffect(() => {
    if (!endAt) {
      reset()
      return
    }

    completedRef.current = false
    const windowMs = endAt - (startAt ?? NaN)
    const determinate = startAt != null && Number.isFinite(windowMs) && windowMs > 0

    let rafId = 0

    const tick = () => {
      const now = Date.now()
      const remainingMs = endAt - now
      const secs = remainingMs <= 0 ? 0 : Math.ceil(remainingMs / 1000)

      if (determinate && startAt != null) {
        const p = Math.min(1, Math.max(0, (now - startAt) / (endAt - startAt)))
        setElapsedProgress(p)
      } else {
        setElapsedProgress(0)
      }

      setRemainingSeconds(secs)

      if (remainingMs <= 0) {
        if (!completedRef.current) {
          completedRef.current = true
          onDoneRef.current?.()
        }
        return
      }

      if (onTickRef.current) {
        const threshold = tickDuration ?? 1
        if (Math.abs(lastTickSecondsRef.current - secs) > threshold) {
          lastTickSecondsRef.current = secs
          onTickRef.current()
        }
      }

      rafId = requestAnimationFrame(tick)
    }

    const initialRemainingMs = endAt - Date.now()
    const initialSecs = initialRemainingMs <= 0 ? 0 : Math.ceil(initialRemainingMs / 1000)
    lastTickSecondsRef.current = initialSecs
    setRemainingSeconds(initialSecs)
    if (determinate && startAt != null) {
      const now = Date.now()
      setElapsedProgress(Math.min(1, Math.max(0, (now - startAt) / (endAt - startAt))))
    }

    if (initialRemainingMs <= 0) {
      if (!completedRef.current) {
        completedRef.current = true
        onDoneRef.current?.()
      }
      return
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [endAt, startAt, tickDuration, reset])

  return {
    remainingSeconds,
    elapsedProgress,
    reset
  }
}

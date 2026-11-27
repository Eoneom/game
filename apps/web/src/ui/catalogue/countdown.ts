import { useEffect, useState } from 'react'

export interface CatalogueCountdown {
  remaining_seconds: number
  /** Elapsed share of the job, 0–1. */
  elapsed: number
}

/**
 * Once-a-second countdown for the card of the entry in progress (slice 043): the queue panel keeps the
 * per-frame `useCountdownProgress`, the grid only needs the badge time and the 4 px bar.
 */
export const useCatalogueCountdown = (startAt?: number, endAt?: number): CatalogueCountdown | null => {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!endAt) {
      return
    }
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [endAt])

  if (!endAt) {
    return null
  }
  const remaining_seconds = Math.max(0, Math.ceil((endAt - now) / 1000))
  const elapsed = startAt != null && endAt > startAt
    ? Math.min(1, Math.max(0, (now - startAt) / (endAt - startAt)))
    : 0
  return { remaining_seconds, elapsed }
}

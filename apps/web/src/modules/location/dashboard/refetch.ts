import { useCallback, useEffect, useRef } from 'react'
import { QueryKey, useQueryClient } from '@tanstack/react-query'

/** Grace period for a WebSocket event to refresh a card after one of its countdowns ends (slice 042). */
export const COUNTDOWN_REFETCH_DELAY_MS = 3000

/**
 * Returns a callback for a countdown's `onDone`: 3 s later, the card's query is invalidated once unless its data
 * was refreshed in the meantime (by a WebSocket event or a mutation).
 */
export const useCountdownRefetch = (queryKey: QueryKey): (() => void) => {
  const queryClient = useQueryClient()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const keyRef = useRef(queryKey)
  keyRef.current = queryKey

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  return useCallback(() => {
    if (timer.current) return
    const key = keyRef.current
    const updatedAt = queryClient.getQueryState(key)?.dataUpdatedAt ?? 0
    timer.current = setTimeout(() => {
      timer.current = null
      const refreshed = (queryClient.getQueryState(key)?.dataUpdatedAt ?? 0) > updatedAt
      if (!refreshed) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    }, COUNTDOWN_REFETCH_DELAY_MS)
  }, [ queryClient ])
}

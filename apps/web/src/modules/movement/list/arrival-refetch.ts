import { useEffect, useRef } from 'react'
import { QueryKey, useQueryClient } from '@tanstack/react-query'

const ARRIVAL_REFETCH_DELAY_MS = 1000

/**
 * When a row's countdown reaches 0, refetch its list once, 1 s later (debounced across rows) so the server has
 * processed the arrival (slice 045). Each row triggers at most one refetch.
 */
export const useArrivalRefetch = ({
  arrivals,
  now,
  queryKey,
}: {
  arrivals: readonly { id: string; arrive_at: number }[]
  now: number
  queryKey: QueryKey
}): void => {
  const queryClient = useQueryClient()
  const handled = useRef(new Set<string>())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const due = arrivals
    .filter(arrival => arrival.arrive_at <= now && !handled.current.has(arrival.id))
    .map(arrival => arrival.id)
    .join(',')

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  useEffect(() => {
    if (!due) return
    due.split(',').forEach(id => handled.current.add(id))
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      void queryClient.invalidateQueries({ queryKey })
    }, ARRIVAL_REFETCH_DELAY_MS)
    // `queryKey` is a constant tuple per caller.
  }, [ due ])
}

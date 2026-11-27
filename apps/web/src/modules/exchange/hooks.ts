import { useEffect, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import type { ExchangeOrderInput, ExchangeResource } from '@eoneom/api-client'

import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { translateError } from '#helpers/error-translations'
import { useAuth } from '#auth/context'

export const exchangeKeys = {
  all: ['exchange'] as const,
  book: (resource: ExchangeResource) => ['exchange', 'book', resource] as const,
  trades: (resource: ExchangeResource) => ['exchange', 'trades', resource] as const,
  mine: ['exchange', 'mine'] as const,
  summary: ['exchange', 'summary'] as const,
  estimate: (input: ExchangeOrderInput) => ['exchange', 'estimate', input] as const,
}

type ApiResult<T> = { status: 'ok'; data?: T } | { status: 'nok'; error_code: string }

const unwrap = <T>(res: ApiResult<T>): T | undefined => {
  if (isError(res)) throw new Error(res.error_code)
  return res.data
}

/** Top 10 price levels per side of the faction's book (slice 035). */
export const useExchangeBook = (resource: ExchangeResource) => {
  const { token } = useAuth()

  return useQuery({
    queryKey: exchangeKeys.book(resource),
    queryFn: async () => {
      if (!token) throw new Error('empty token')
      return unwrap(await client.exchange.book(token, { resource })) ?? { resource, bids: [], asks: [] }
    },
    enabled: !!token,
  })
}

/** Last 50 trades of the faction for the pair, newest first. */
export const useExchangeTrades = (resource: ExchangeResource) => {
  const { token } = useAuth()

  return useQuery({
    queryKey: exchangeKeys.trades(resource),
    queryFn: async () => {
      if (!token) throw new Error('empty token')
      return unwrap(await client.exchange.trades(token, { resource }))?.trades ?? []
    },
    enabled: !!token,
  })
}

/** Best matchable bid / ask (other players only) and last trade of every pair of the faction (slice 046). */
export const useExchangeSummary = () => {
  const { token } = useAuth()

  return useQuery({
    queryKey: exchangeKeys.summary,
    queryFn: async () => {
      if (!token) throw new Error('empty token')
      return unwrap(await client.exchange.summary(token)) ?? { pairs: [] }
    },
    enabled: !!token,
  })
}

/** Own open orders with their reservations, the last closed orders and the cities that can trade (slice 046). */
export const useMyExchangeOrders = () => {
  const { token } = useAuth()

  return useQuery({
    queryKey: exchangeKeys.mine,
    queryFn: async () => {
      if (!token) throw new Error('empty token')
      return unwrap(await client.exchange.mine(token)) ?? { open: [], closed: [], trading_posts: [] }
    },
    enabled: !!token,
  })
}

const ESTIMATE_DEBOUNCE_MS = 300

/** `input` once it has not changed for `delay` ms (compared by content). */
const useDebouncedInput = (input: ExchangeOrderInput | null, delay: number): ExchangeOrderInput | null => {
  const [ debounced, setDebounced ] = useState(input)
  const key = JSON.stringify(input)

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(input), delay)
    return () => clearTimeout(timeout)
    // The serialised key stands for the input: a new object with the same content does not restart the delay.
  }, [ key, delay ])

  return debounced
}

/**
 * What an order would reserve, its carrier load against the free capacity, the delivery time to a typical faction
 * city and the immediate-fill dry run, 300 ms after the last edit (slices 035, 046). `input` is the order the
 * answer is for; `isPlaceholderData` is true while the previous order's answer is shown.
 */
export const useExchangeEstimate = (input: ExchangeOrderInput | null) => {
  const { token } = useAuth()
  const debounced = useDebouncedInput(input, ESTIMATE_DEBOUNCE_MS)
  const current = JSON.stringify(input) === JSON.stringify(debounced)

  const query = useQuery({
    queryKey: debounced ? exchangeKeys.estimate(debounced) : ['exchange', 'estimate', 'none'],
    queryFn: async () => {
      if (!token || !debounced) throw new Error('empty token or input')
      const data = unwrap(await client.exchange.estimateOrder(token, debounced))
      if (!data) throw new Error('no data')
      return data
    },
    enabled: !!token && !!debounced,
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 5_000,
  })

  return {
    ...query,
    input: debounced,
    /** The answer matches the order being edited (not a previous one, not waiting for the debounce). */
    isCurrent: current && !!debounced && !!query.data && !query.isPlaceholderData,
  }
}

const useRefreshAfterOrder = () => {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: exchangeKeys.all })
    queryClient.invalidateQueries({ queryKey: ['city'] })
    queryClient.invalidateQueries({ queryKey: ['troops'] })
    queryClient.invalidateQueries({ queryKey: ['movements'] })
  }
}

export const usePlaceExchangeOrder = () => {
  const { token } = useAuth()
  const refresh = useRefreshAfterOrder()

  return useMutation({
    mutationFn: async (input: ExchangeOrderInput) => {
      if (!token) throw new Error('empty token')
      const data = unwrap(await client.exchange.placeOrder(token, input))
      if (!data) throw new Error('no data')
      return data
    },
    onSuccess: ({ filled_lots }) => {
      toast.success(filled_lots > 0
        ? `Ordre passé : ${filled_lots} lot${filled_lots > 1 ? 's' : ''} exécuté${filled_lots > 1 ? 's' : ''} immédiatement`
        : 'Ordre placé dans la bourse')
      refresh()
    },
    onError: (err: Error) => toast.error(translateError(err.message)),
  })
}

export const useCancelExchangeOrder = () => {
  const { token } = useAuth()
  const refresh = useRefreshAfterOrder()

  return useMutation({
    mutationFn: async (order_id: string) => {
      if (!token) throw new Error('empty token')
      unwrap(await client.exchange.cancelOrder(token, { order_id }))
    },
    onSuccess: () => {
      toast.success('Ordre annulé : les ressources et les transporteurs sont libérés')
      refresh()
    },
    onError: (err: Error) => toast.error(translateError(err.message)),
  })
}

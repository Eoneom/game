import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

/** Own open orders with their reservations and the last closed orders. */
export const useMyExchangeOrders = () => {
  const { token } = useAuth()

  return useQuery({
    queryKey: exchangeKeys.mine,
    queryFn: async () => {
      if (!token) throw new Error('empty token')
      return unwrap(await client.exchange.mine(token)) ?? { open: [], closed: [] }
    },
    enabled: !!token,
  })
}

/** What an order form would reserve, and its delivery time to a typical faction city. */
export const useExchangeEstimate = (input: ExchangeOrderInput | null) => {
  const { token } = useAuth()

  return useQuery({
    queryKey: input ? exchangeKeys.estimate(input) : ['exchange', 'estimate', 'none'],
    queryFn: async () => {
      if (!token || !input) throw new Error('empty token or input')
      const data = unwrap(await client.exchange.estimateOrder(token, input))
      if (!data) throw new Error('no data')
      return data
    },
    enabled: !!token && !!input,
    retry: false,
    staleTime: 5_000,
  })
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

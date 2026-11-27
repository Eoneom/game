import {
  AppEvent,
  type ExchangeBookUpdatedEventPayload,
  type ExchangeFilledEventPayload,
} from '@eoneom/api-client'
import { toast } from 'react-toastify'

import { wsClient } from '#helpers/websocket'
import { queryClient } from '#helpers/query-client'
import { exchangeKeys } from '#exchange/hooks'
import { reportKeys } from '#communication/report/hooks'

let registered = false

/** Faction exchange events (slice 035). */
export function registerExchangeWsListeners(): void {
  if (registered) return
  registered = true

  wsClient.on<ExchangeBookUpdatedEventPayload>(AppEvent.ExchangeBookUpdated, ({ resource }) => {
    queryClient.invalidateQueries({ queryKey: exchangeKeys.book(resource) })
    queryClient.invalidateQueries({ queryKey: exchangeKeys.trades(resource) })
  })

  wsClient.on<ExchangeFilledEventPayload>(AppEvent.ExchangeFilled, ({ lots, price }) => {
    toast.info(`Bourse : ${lots} lot${lots > 1 ? 's' : ''} échangé${lots > 1 ? 's' : ''} à ${price} eau pure`)
    queryClient.invalidateQueries({ queryKey: exchangeKeys.mine })
    queryClient.invalidateQueries({ queryKey: ['movements'] })
    queryClient.invalidateQueries({ queryKey: ['troops'] })
    queryClient.invalidateQueries({ queryKey: ['city'] })
    queryClient.invalidateQueries({ queryKey: reportKeys.unreadCount })
    queryClient.invalidateQueries({ queryKey: ['reports'] })
  })
}

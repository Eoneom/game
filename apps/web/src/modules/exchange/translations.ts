import {
  ExchangeOrderStatus,
  ExchangeResource,
  ExchangeSide,
  exchange_lot_size,
  type Resource,
} from '@eoneom/api-client'

import { formatCompactDuration } from '#helpers/transform'

export const ExchangeResourceLabels: Record<ExchangeResource, string> = {
  [ExchangeResource.PLASTIC]: 'Plastique',
  [ExchangeResource.MUSHROOM]: 'Champignon',
  [ExchangeResource.PLASMA]: 'Plasma',
}

const ResourceUnitLabels: Record<ExchangeResource, string> = {
  [ExchangeResource.PLASTIC]: 'plastique',
  [ExchangeResource.MUSHROOM]: 'champignon',
  [ExchangeResource.PLASMA]: 'plasma',
}

/** Order type in tables: « Achat » / « Vente ». */
export const ExchangeSideLabels: Record<ExchangeSide, string> = {
  [ExchangeSide.BUY]: 'Achat',
  [ExchangeSide.SELL]: 'Vente',
}

/** « Vendre | Acheter » toggle of the quick trade (slice 046). */
export const ExchangeSideActionLabels: Record<ExchangeSide, string> = {
  [ExchangeSide.BUY]: 'Acheter',
  [ExchangeSide.SELL]: 'Vendre',
}

export const ExchangeStatusLabels: Record<ExchangeOrderStatus, string> = {
  [ExchangeOrderStatus.OPEN]: 'Ouvert',
  [ExchangeOrderStatus.FILLED]: 'Exécuté',
  [ExchangeOrderStatus.CANCELLED]: 'Annulé',
  [ExchangeOrderStatus.EXPIRED]: 'Expiré',
}

/** `300 plastique`. */
export const formatResourceAmount = (resource: ExchangeResource, amount: number): string =>
  `${amount} ${ResourceUnitLabels[resource]}`

/** `1 lot = 100 plastique` (plastic, mushroom) or `1 lot = 1 plasma`. */
export const formatLotSize = (resource: ExchangeResource): string =>
  `1 lot = ${formatResourceAmount(resource, exchange_lot_size[resource])}`

/** `3 lots (300 plastique)`. */
export const formatLots = (resource: ExchangeResource, lots: number): string =>
  `${lots} lot${lots > 1 ? 's' : ''} (${formatResourceAmount(resource, lots * exchange_lot_size[resource])})`

/** `12 eau pure / lot`. */
export const formatPrice = (price: number): string => `${price} eau pure / lot`

/** Delivery time such as `2 h 05 min` or `12 min`, from milliseconds. */
export const formatDeliveryDuration = (duration_ms: number): string => {
  const minutes = Math.max(1, Math.ceil(duration_ms / 60_000))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return `${hours} h ${String(rest).padStart(2, '0')} min`
}

/** `300 plastique, 45 eau pure`: the resources an order holds in escrow. */
export const formatReservedResources = (resources: Resource): string => [
  resources.plastic > 0 ? `${resources.plastic} plastique` : null,
  resources.mushroom > 0 ? `${resources.mushroom} champignon` : null,
  resources.plasma > 0 ? `${resources.plasma} plasma` : null,
  resources.water > 0 ? `${resources.water} eau pure` : null,
].filter(Boolean).join(', ')

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000

/**
 * Time left before an order expires (slice 046): `6 j 4 h` from a day on, else the compact duration (`4 h 05`,
 * `12 min`); `bientôt` once the 7 days are over (the hourly expiry job has not run yet).
 */
export const formatRelativeExpiry = (expires_at: number, now: number): string => {
  const left = expires_at - now
  if (left <= 0) return 'bientôt'
  if (left >= DAY_MS) {
    const days = Math.floor(left / DAY_MS)
    const hours = Math.floor((left % DAY_MS) / HOUR_MS)
    return hours > 0 ? `${days} j ${hours} h` : `${days} j`
  }
  return formatCompactDuration(left / 1000)
}

/** `25/11 14:02`. */
const formatShortDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Caption of the price line: `50 derniers échanges, du 25/11 14:02 au 27/11 09:41` (trades newest first). */
export const formatTradeSpan = (trades: { executed_at: number }[]): string => {
  if (trades.length === 0) return ''
  const newest = trades[0].executed_at
  const oldest = trades[trades.length - 1].executed_at
  if (trades.length === 1) return `1 échange, le ${formatShortDate(newest)}`
  return `${trades.length} derniers échanges, du ${formatShortDate(oldest)} au ${formatShortDate(newest)}`
}

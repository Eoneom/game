import {
  ExchangeOrderStatus,
  ExchangeResource,
  ExchangeSide,
  exchange_lot_size,
} from '@eoneom/api-client'

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

export const ExchangeSideLabels: Record<ExchangeSide, string> = {
  [ExchangeSide.BUY]: 'Achat',
  [ExchangeSide.SELL]: 'Vente',
}

export const ExchangeStatusLabels: Record<ExchangeOrderStatus, string> = {
  [ExchangeOrderStatus.OPEN]: 'Ouvert',
  [ExchangeOrderStatus.FILLED]: 'Exécuté',
  [ExchangeOrderStatus.CANCELLED]: 'Annulé',
  [ExchangeOrderStatus.EXPIRED]: 'Expiré',
}

/** `1 lot = 100 plastique` (plastic, mushroom) or `1 lot = 1 plasma`. */
export const formatLotSize = (resource: ExchangeResource): string =>
  `1 lot = ${exchange_lot_size[resource]} ${ResourceUnitLabels[resource]}`

/** `3 lots (300 plastique)`. */
export const formatLots = (resource: ExchangeResource, lots: number): string =>
  `${lots} lot${lots > 1 ? 's' : ''} (${lots * exchange_lot_size[resource]} ${ResourceUnitLabels[resource]})`

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

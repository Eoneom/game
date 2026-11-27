import { ExchangeSide, exchange_lot_size, resource_transport_weight, type ExchangeResource } from '@eoneom/api-client'

export interface CityStock {
  plastic: number
  mushroom: number
  plasma: number
  water: number
}

interface MaxLotsInput {
  side: ExchangeSide
  resource: ExchangeResource
  /** Water per lot; a buy needs it (`null` when the price field is not a valid price). */
  price: number | null
  /** Stock of the selected city (`GET /city/:city_id`); `undefined` until loaded. */
  stock: CityStock | undefined
  /** Capacity of the city's free carriers from the estimate; `null` until it has answered once for the city. */
  availableCarrierCapacity: number | null
}

/**
 * « Max » quantity of the quick trade (slice 046), or `null` while it cannot be computed (button disabled):
 * - sell: `min(floor(stock / lot_size), floor(capacity / (lot_size × weight)))`;
 * - buy: `min(floor(water / price), floor(capacity / (price × weight_water)))`.
 */
export const maxLots = ({ side, resource, price, stock, availableCarrierCapacity }: MaxLotsInput): number | null => {
  if (!stock || availableCarrierCapacity === null) return null
  if (side === ExchangeSide.SELL) {
    const lotSize = exchange_lot_size[resource]
    return Math.min(
      Math.floor(stock[resource] / lotSize),
      Math.floor(availableCarrierCapacity / (lotSize * resource_transport_weight[resource]))
    )
  }
  if (price === null || price < 1) return null
  return Math.min(
    Math.floor(stock.water / price),
    Math.floor(availableCarrierCapacity / (price * resource_transport_weight.water))
  )
}

import { ExchangeResource } from '../value/resource'

/** Units of the resource in one lot; prices are integer water per lot (slice 035). */
export const exchange_lot_size: Record<ExchangeResource, number> = {
  [ExchangeResource.PLASTIC]: 100,
  [ExchangeResource.MUSHROOM]: 100,
  [ExchangeResource.PLASMA]: 1,
}

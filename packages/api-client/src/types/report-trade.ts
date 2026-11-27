import { ExchangeResource } from '@server-core/exchange/value/resource'
import { ExchangeSide } from '@server-core/exchange/value/side'
import { Coordinates } from '../endpoints/shared/coordinates'

export type ReportTradeCity = {
  id: string
  name: string
  coordinates: Coordinates
}

/** `trade` report details, from the reader's side (slice 035). */
export type ReportTradeMetadata = {
  order_id: string
  side: ExchangeSide
  resource: ExchangeResource
  lots: number
  /** Execution price, water per lot. */
  price: number
  /** Water released to the buyer when its limit was above the execution price (0 for a seller). */
  refunded_water: number
  /** The reader's order city. */
  city: ReportTradeCity
  counterparty_city: ReportTradeCity
  counterparty_player_id: string
  /** `[TAG] Name` of the other party. */
  counterparty_name: string
  /** Arrival of the convoy the reader sends. */
  outgoing_arrive_at: number
  /** Arrival of the convoy the reader receives. */
  incoming_arrive_at: number
}

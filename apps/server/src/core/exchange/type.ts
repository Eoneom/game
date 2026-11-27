import { ExchangeResource } from '#core/exchange/value/resource'
import { ExchangeSide } from '#core/exchange/value/side'
import { TroopCode } from '#core/troop/constant/code'
import { TroopCount } from '#core/troop/type'
import { Coordinates } from '#core/world/value/coordinates'

/** Carriers of one stack held by an order: the stack is (order city cell, order player, `troop_code`). */
export interface CarrierReservation {
  troop_code: TroopCode
  count: number
}

/** Carriers of one convoy: first from the order's reservation, then from the city's free carriers. */
export interface ConvoyCarriers {
  from_reservation: TroopCount[]
  from_free: TroopCount[]
}

export interface ExchangeBookLevel {
  price: number
  lots: number
}

export interface ExchangeTradeView {
  price: number
  lots: number
  executed_at: number
}

export interface ExchangeCityRef {
  id: string
  name: string
  coordinates: Coordinates
}

/** `trade` report metadata, one per party (slice 035). */
export interface ReportTradeMetadata {
  order_id: string
  side: ExchangeSide
  resource: ExchangeResource
  lots: number
  price: number
  /** Water released to the buyer when its limit was above the execution price (0 for the seller). */
  refunded_water: number
  city: ExchangeCityRef
  counterparty_city: ExchangeCityRef
  /** Arrival of the convoy this party sends. */
  outgoing_arrive_at: number
  /** Arrival of the convoy this party receives. */
  incoming_arrive_at: number
}

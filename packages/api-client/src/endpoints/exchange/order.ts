import { ExchangeOrderStatus } from '@server-core/exchange/value/order-status'
import { GenericResponse } from '../../response'
import { Resource } from '../shared/resource'
import {
  ExchangeCarrierCount,
  ExchangeOrder,
  ExchangeOrderInput
} from './shared'

export type ExchangePlaceOrderRequest = ExchangeOrderInput

export interface ExchangePlaceOrderDataResponse {
  order_id: string
  status: ExchangeOrderStatus
  /** Lots matched immediately. */
  filled_lots: number
}

export type ExchangePlaceOrderResponse = GenericResponse<ExchangePlaceOrderDataResponse>

export type ExchangeEstimateOrderRequest = ExchangeOrderInput

export interface ExchangeEstimateOrderDataResponse {
  reserved_resources: Resource
  enough_resources: boolean
  /** `null` when the city's available carriers cannot carry the order. */
  reserved_carriers: ExchangeCarrierCount[] | null
  /** Milliseconds for a full delivery to a typical faction city; `null` without carriers. */
  typical_delivery_duration: number | null
  open_order_count: number
  open_order_limit: number
  /** Transport load of the reserved payload: Σ amount × resource_transport_weight (slice 046). */
  carrier_load: number
  /** Capacity of the city's available (unreserved) carriers, with the faction logistics bonus (slice 046). */
  available_carrier_capacity: number
  /**
   * Dry run of the matching against other players' crossing open orders (price-time, execution at the resting
   * price). Approximate: does not check the resting side's carriers, so the real fill can be smaller (slice 046).
   */
  immediate_fill: { lots: number, water: number }
}

export type ExchangeEstimateOrderResponse = GenericResponse<ExchangeEstimateOrderDataResponse>

export type ExchangeCancelOrderResponse = GenericResponse<undefined>

export interface ExchangeMineDataResponse {
  open: ExchangeOrder[]
  /** Last 50 closed orders, newest first. */
  closed: ExchangeOrder[]
  /** Caller's cities with trading_post ≥ 1, by name (slice 046). */
  trading_posts: ExchangeTradingPost[]
}

export interface ExchangeTradingPost {
  city_id: string
  city_name: string
  /** trading_post level, also the city's open order limit. */
  level: number
  open_order_count: number
}

export type ExchangeMineResponse = GenericResponse<ExchangeMineDataResponse>

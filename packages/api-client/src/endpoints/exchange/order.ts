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
}

export type ExchangeEstimateOrderResponse = GenericResponse<ExchangeEstimateOrderDataResponse>

export type ExchangeCancelOrderResponse = GenericResponse<undefined>

export interface ExchangeMineDataResponse {
  open: ExchangeOrder[]
  /** Last 50 closed orders, newest first. */
  closed: ExchangeOrder[]
}

export type ExchangeMineResponse = GenericResponse<ExchangeMineDataResponse>

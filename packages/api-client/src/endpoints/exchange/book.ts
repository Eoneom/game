import { ExchangeResource } from '@server-core/exchange/value/resource'
import { GenericResponse } from '../../response'

export interface ExchangeBookLevel {
  price: number
  lots: number
}

export interface ExchangeBookDataResponse {
  resource: ExchangeResource
  /** Buy levels, highest price first (top 10). */
  bids: ExchangeBookLevel[]
  /** Sell levels, lowest price first (top 10). */
  asks: ExchangeBookLevel[]
}

export type ExchangeBookResponse = GenericResponse<ExchangeBookDataResponse>

export interface ExchangeTrade {
  price: number
  lots: number
  executed_at: number
}

export interface ExchangeTradesDataResponse {
  resource: ExchangeResource
  /** Last 50 trades of the faction, newest first. */
  trades: ExchangeTrade[]
}

export type ExchangeTradesResponse = GenericResponse<ExchangeTradesDataResponse>

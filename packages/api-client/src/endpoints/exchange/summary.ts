import { ExchangeResource } from '@server-core/exchange/value/resource'
import { GenericResponse } from '../../response'
import { ExchangeBookLevel } from './book'

export interface ExchangeSummaryPair {
  resource: ExchangeResource
  /** Highest buy price among other players' open orders, with the lots at that price; null when none. */
  best_bid: ExchangeBookLevel | null
  /** Lowest sell price among other players' open orders; null when none. */
  best_ask: ExchangeBookLevel | null
  last_trade: { price: number, executed_at: number } | null
}

export interface ExchangeSummaryDataResponse {
  /** Always the 3 pairs, in `ExchangeResource` order. */
  pairs: ExchangeSummaryPair[]
}

export type ExchangeSummaryResponse = GenericResponse<ExchangeSummaryDataResponse>

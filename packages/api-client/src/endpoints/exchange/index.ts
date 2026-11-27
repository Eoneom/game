import { ExchangeResource } from '@server-core/exchange/value/resource'
import { Fetcher } from '../../fetcher'
import {
  ExchangeBookResponse,
  ExchangeTradesResponse
} from './book'
import {
  ExchangeCancelOrderResponse,
  ExchangeEstimateOrderRequest,
  ExchangeEstimateOrderResponse,
  ExchangeMineResponse,
  ExchangePlaceOrderRequest,
  ExchangePlaceOrderResponse
} from './order'
import { ExchangeSummaryResponse } from './summary'

/** Faction exchange (slice 035). */
export class ExchangeEndpoint {
  private fetcher: Fetcher

  constructor({ fetcher }: { fetcher: Fetcher }) {
    this.fetcher = fetcher
  }

  placeOrder(token: string, body: ExchangePlaceOrderRequest): Promise<ExchangePlaceOrderResponse> {
    return this.fetcher.post('/exchange/order', {
      token,
      body
    })
  }

  estimateOrder(token: string, body: ExchangeEstimateOrderRequest): Promise<ExchangeEstimateOrderResponse> {
    return this.fetcher.post('/exchange/order/estimate', {
      token,
      body
    })
  }

  cancelOrder(token: string, { order_id }: { order_id: string }): Promise<ExchangeCancelOrderResponse> {
    return this.fetcher.delete(`/exchange/order/${order_id}`, { token })
  }

  mine(token: string): Promise<ExchangeMineResponse> {
    return this.fetcher.get('/exchange/order/mine', { token })
  }

  book(token: string, { resource }: { resource: ExchangeResource }): Promise<ExchangeBookResponse> {
    return this.fetcher.get('/exchange/book', {
      token,
      searchParams: { resource }
    })
  }

  /** Best matchable prices and last trade of every pair (slice 046). */
  summary(token: string): Promise<ExchangeSummaryResponse> {
    return this.fetcher.get('/exchange/summary', { token })
  }

  trades(token: string, { resource }: { resource: ExchangeResource }): Promise<ExchangeTradesResponse> {
    return this.fetcher.get('/exchange/trades', {
      token,
      searchParams: { resource }
    })
  }
}

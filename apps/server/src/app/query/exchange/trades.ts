import { GenericQuery } from '#query/generic'
import { resolveExchangeBook } from '#query/exchange/shared'
import { EXCHANGE_HISTORY_LIMIT } from '#core/exchange/constant/limits'
import { ExchangeTradeView } from '#core/exchange/type'
import { ExchangeResource } from '#core/exchange/value/resource'

interface ExchangeTradesQueryRequest {
  player_id: string
  resource: unknown
}

interface ExchangeTradesQueryResponse {
  resource: ExchangeResource
  trades: ExchangeTradeView[]
}

/** `GET /exchange/trades?resource=` (slice 035): last trades of the caller's faction book, newest first, anonymous. */
export class ExchangeTradesQuery extends GenericQuery<ExchangeTradesQueryRequest, ExchangeTradesQueryResponse> {
  constructor() {
    super({ name: 'exchange:trades' })
  }

  protected async get({
    player_id,
    resource
  }: ExchangeTradesQueryRequest): Promise<ExchangeTradesQueryResponse> {
    const book = await resolveExchangeBook({
      player_id,
      resource
    })
    const trades = await this.repository.exchange.listTrades({
      ...book,
      limit: EXCHANGE_HISTORY_LIMIT
    })
    return {
      resource: book.resource,
      trades
    }
  }
}

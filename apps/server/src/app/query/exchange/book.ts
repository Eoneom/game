import { GenericQuery } from '#query/generic'
import { resolveExchangeBook } from '#query/exchange/shared'
import { EXCHANGE_BOOK_DEPTH } from '#core/exchange/constant/limits'
import { ExchangeBookLevel } from '#core/exchange/type'
import { ExchangeResource } from '#core/exchange/value/resource'

interface ExchangeBookQueryRequest {
  player_id: string
  resource: unknown
}

interface ExchangeBookQueryResponse {
  resource: ExchangeResource
  bids: ExchangeBookLevel[]
  asks: ExchangeBookLevel[]
}

/**
 * `GET /exchange/book?resource=` (slice 035): top price levels per side of the caller's faction book, anonymous;
 * each level tells the caller how many of its lots are its own (`own_lots`, slice 046).
 */
export class ExchangeBookQuery extends GenericQuery<ExchangeBookQueryRequest, ExchangeBookQueryResponse> {
  constructor() {
    super({ name: 'exchange:book' })
  }

  protected async get({
    player_id,
    resource
  }: ExchangeBookQueryRequest): Promise<ExchangeBookQueryResponse> {
    const book = await resolveExchangeBook({
      player_id,
      resource
    })
    const {
      bids, asks
    } = await this.repository.exchange.getBook({
      ...book,
      depth: EXCHANGE_BOOK_DEPTH,
      viewer_player_id: player_id
    })
    return {
      resource: book.resource,
      bids,
      asks
    }
  }
}

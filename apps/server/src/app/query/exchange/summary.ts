import { GenericQuery } from '#query/generic'
import {
  ExchangeBookLevel,
  ExchangeLastTrade
} from '#core/exchange/type'
import { ExchangeResource } from '#core/exchange/value/resource'
import { ExchangeSide } from '#core/exchange/value/side'

interface ExchangeSummaryQueryRequest {
  player_id: string
}

interface ExchangeSummaryPair {
  resource: ExchangeResource
  /** Highest buy price among other players' open orders, with the lots at that price; `null` when none. */
  best_bid: ExchangeBookLevel | null
  /** Lowest sell price among other players' open orders; `null` when none. */
  best_ask: ExchangeBookLevel | null
  last_trade: ExchangeLastTrade | null
}

interface ExchangeSummaryQueryResponse {
  /** Always the three pairs, in `ExchangeResource` order. */
  pairs: ExchangeSummaryPair[]
}

/**
 * `GET /exchange/summary` (slice 046): best matchable prices and last trade of every pair of the caller's faction.
 * The caller's own orders are excluded, since matching never pairs them with the caller (slice 035).
 */
export class ExchangeSummaryQuery extends GenericQuery<ExchangeSummaryQueryRequest, ExchangeSummaryQueryResponse> {
  constructor() {
    super({ name: 'exchange:summary' })
  }

  protected async get({ player_id }: ExchangeSummaryQueryRequest): Promise<ExchangeSummaryQueryResponse> {
    const player = await this.repository.player.get(player_id)
    const resources = Object.values(ExchangeResource)
    const [
      best_levels,
      last_trades
    ] = await Promise.all([
      this.repository.exchange.bestLevels({
        faction_code: player.faction_code,
        exclude_player_id: player_id
      }),
      Promise.all(resources.map(resource => this.repository.exchange.lastTrade({
        faction_code: player.faction_code,
        resource
      }))),
    ])

    const bestLevel = (resource: ExchangeResource, side: ExchangeSide): ExchangeBookLevel | null => {
      const level = best_levels.find(candidate => candidate.resource === resource && candidate.side === side)
      return level
        ? {
          price: level.price,
          lots: level.lots,
          own_lots: 0
        }
        : null
    }

    return {
      pairs: resources.map((resource, index) => ({
        resource,
        best_bid: bestLevel(resource, ExchangeSide.BUY),
        best_ask: bestLevel(resource, ExchangeSide.SELL),
        last_trade: last_trades[index],
      })),
    }
  }
}

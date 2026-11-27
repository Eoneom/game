import { GenericQuery } from '#query/generic'
import { BuildingCode } from '#core/building/constant/code'
import { EXCHANGE_HISTORY_LIMIT } from '#core/exchange/constant/limits'
import { ExchangeOrderEntity } from '#core/exchange/entity'
import { ExchangeService } from '#core/exchange/service'
import { CarrierReservation } from '#core/exchange/type'
import { Resource } from '#shared/resource'

export interface ExchangeMineOrder {
  order: ExchangeOrderEntity
  city_name: string
  /** Open orders only: escrow still held for the unfilled lots, and the carriers still reserved. */
  reserved_resources: Resource | null
  reserved_carriers: CarrierReservation[]
}

/** A city of the caller that can trade (slice 046). */
interface ExchangeTradingPost {
  city_id: string
  city_name: string
  /** `trading_post` level, also the city's open order limit. */
  level: number
  open_order_count: number
}

interface ExchangeMineQueryRequest {
  player_id: string
}

interface ExchangeMineQueryResponse {
  open: ExchangeMineOrder[]
  closed: ExchangeMineOrder[]
  /** Caller's cities with `trading_post` ≥ 1, by name (slice 046). */
  trading_posts: ExchangeTradingPost[]
}

/**
 * `GET /exchange/order/mine` (slice 035): own open orders with their reservations and the last closed orders, plus
 * the caller's cities that have a trading post with their open order counts (slice 046).
 */
export class ExchangeMineQuery extends GenericQuery<ExchangeMineQueryRequest, ExchangeMineQueryResponse> {
  constructor() {
    super({ name: 'exchange:order:mine' })
  }

  protected async get({ player_id }: ExchangeMineQueryRequest): Promise<ExchangeMineQueryResponse> {
    const [
      open_orders,
      closed_orders,
      cities
    ] = await Promise.all([
      this.repository.exchange.listOpenByPlayer(player_id),
      this.repository.exchange.listClosedByPlayer({
        player_id,
        limit: EXCHANGE_HISTORY_LIMIT
      }),
      this.repository.city.list({ player_id }),
    ])
    const city_names = new Map(cities.map(city => [
      city.id,
      city.name
    ]))
    // A captured city keeps the orders' history but is no longer listed among the player's cities.
    const cityName = (city_id: string): string => city_names.get(city_id) ?? ''

    const trading_post_levels = await Promise.all(cities.map(city => this.repository.building.getLevel({
      city_id: city.id,
      code: BuildingCode.TRADING_POST
    })))
    const trading_posts = cities
      .map((city, index) => ({
        city_id: city.id,
        city_name: city.name,
        level: trading_post_levels[index],
        open_order_count: open_orders.filter(order => order.city_id === city.id).length,
      }))
      .filter(trading_post => trading_post.level >= 1)
      .sort((a, b) => a.city_name.localeCompare(b.city_name))

    const open = await Promise.all(open_orders.map(async order => ({
      order,
      city_name: cityName(order.city_id),
      reserved_resources: ExchangeService.remainingEscrow(order),
      reserved_carriers: await this.repository.exchange.listReservations(order.id),
    })))

    return {
      open,
      closed: closed_orders.map(order => ({
        order,
        city_name: cityName(order.city_id),
        reserved_resources: null,
        reserved_carriers: [],
      })),
      trading_posts,
    }
  }
}

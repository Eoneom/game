import { GenericQuery } from '#query/generic'
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

interface ExchangeMineQueryRequest {
  player_id: string
}

interface ExchangeMineQueryResponse {
  open: ExchangeMineOrder[]
  closed: ExchangeMineOrder[]
}

/** `GET /exchange/order/mine` (slice 035): own open orders with their reservations and the last closed orders. */
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
    }
  }
}

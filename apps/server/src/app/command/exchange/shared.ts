import { Factory } from '#adapter/factory'
import { ExchangeOrderEntity } from '#core/exchange/entity'
import { ExchangeService } from '#core/exchange/service'
import { ExchangeOrderStatus } from '#core/exchange/value/order-status'
import { ExchangeResource } from '#core/exchange/value/resource'
import { AppEvent } from '#core/events'
import { FactionCode } from '#core/faction/constant/code'

export interface ExchangeMarket {
  faction_code: FactionCode
  resource: ExchangeResource
}

export interface ExchangeFill {
  player_id: string
  order_id: string
  lots: number
  price: number
}

/** Per-market lock key (faction + resource): orders of one book are placed, cancelled and expired one at a time. */
function exchangeMarketKey({
  faction_code,
  resource
}: { faction_code: string, resource: string }): string {
  return `exchange:${faction_code}:${resource}`
}

/** Runs `fn` in its own command transaction while holding the market lock. */
export function runInExchangeMarket<T>(market: { faction_code: string, resource: string }, fn: () => Promise<T>): Promise<T> {
  return Factory.getLock().runExclusive(exchangeMarketKey(market), fn)
}

/**
 * Closes an open order with `status`: the unfilled escrow returns to the order city's stock (whoever owns it now)
 * and the carriers it still reserves are released. Convoys already sent continue.
 */
export async function releaseExchangeOrder({
  order,
  status,
  closed_at,
}: {
  order: ExchangeOrderEntity
  status: ExchangeOrderStatus.CANCELLED | ExchangeOrderStatus.EXPIRED
  closed_at: number
}): Promise<ExchangeOrderEntity> {
  const repository = Factory.getRepository()
  const city = await repository.city.get(order.city_id)
  const stock = await repository.resource_stock.getByCellId({ cell_id: city.cell_id })
  await repository.resource_stock.updateOne(stock.refund({ resource: ExchangeService.remainingEscrow(order) }))
  await repository.exchange.saveReservations({
    order_id: order.id,
    reservations: []
  })
  const closed = order.close({
    status,
    closed_at
  })
  await repository.exchange.updateOrder(closed)
  return closed
}

/**
 * City capture (slice 024): the captured city's open orders are cancelled and their escrow goes to the city stock,
 * now the new owner's. Runs inside the battle outcome transaction; the order rows are locked so a concurrent
 * match cannot fill them meanwhile.
 */
export async function cancelCityExchangeOrders({
  city_id,
  closed_at,
}: {
  city_id: string
  closed_at: number
}): Promise<ExchangeMarket[]> {
  const repository = Factory.getRepository()
  const orders = await repository.exchange.listOpenByCityForUpdate(city_id)
  for (const order of orders) {
    await releaseExchangeOrder({
      order,
      status: ExchangeOrderStatus.CANCELLED,
      closed_at
    })
  }
  return orders.map(order => ({
    faction_code: order.faction_code,
    resource: order.resource
  }))
}

export function emitExchangeFills(fills: ExchangeFill[]): void {
  const event_bus = Factory.getEventBus()
  for (const fill of fills) {
    event_bus.emit(AppEvent.ExchangeFilled, fill)
  }
}

/** One `exchange:book-updated` per distinct book; the WS layer throttles them. */
export function emitExchangeBookUpdated(markets: ExchangeMarket[]): void {
  const event_bus = Factory.getEventBus()
  const seen = new Set<string>()
  for (const market of markets) {
    const key = exchangeMarketKey(market)
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    event_bus.emit(AppEvent.ExchangeBookUpdated, market)
  }
}

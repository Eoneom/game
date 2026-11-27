import {
  ExchangeRepository,
  ExchangeTradeParties,
  ExchangeTradeRecord
} from '#app/port/repository/exchange'
import { getDatabase } from '#adapter/database/context'
import type { DB } from '#adapter/database/types'
import {
  fromTimestamp,
  fromTimestampRequired,
  toTimestamp,
  toTimestampRequired
} from '#adapter/database/repository/shared/time'
import { ExchangeOrderEntity } from '#core/exchange/entity'
import {
  CarrierReservation,
  ExchangeBookLevel,
  ExchangeTradeView
} from '#core/exchange/type'
import { ExchangeOrderStatus } from '#core/exchange/value/order-status'
import { ExchangeResource } from '#core/exchange/value/resource'
import { ExchangeSide } from '#core/exchange/value/side'
import { FactionCode } from '#core/faction/constant/code'
import { TroopCode } from '#core/troop/constant/code'
import { Coordinates } from '#core/world/value/coordinates'
import { isId } from '#shared/identification'
import {
  Kysely,
  Selectable,
  sql
} from 'kysely'

export class PostgresExchangeRepository implements ExchangeRepository {
  private get db(): Kysely<DB> {
    return getDatabase()
  }

  async createOrder(order: ExchangeOrderEntity): Promise<void> {
    await this.db
      .insertInto('exchange_order')
      .values({
        id: order.id,
        player_id: order.player_id,
        faction_code: order.faction_code,
        city_id: order.city_id,
        side: order.side,
        resource: order.resource,
        lots: order.lots,
        filled_lots: order.filled_lots,
        price: order.price,
        status: order.status,
        created_at: toTimestampRequired(order.created_at),
        closed_at: toTimestamp(order.closed_at),
      })
      .execute()
  }

  async updateOrder(order: ExchangeOrderEntity): Promise<void> {
    await this.db
      .updateTable('exchange_order')
      .set({
        filled_lots: order.filled_lots,
        status: order.status,
        closed_at: toTimestamp(order.closed_at),
      })
      .where('id', '=', order.id)
      .execute()
  }

  async findOrder(id: string): Promise<ExchangeOrderEntity | null> {
    if (!isId(id)) {
      return null
    }
    const row = await this.db
      .selectFrom('exchange_order')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()
    return row ? this.buildOrder(row) : null
  }

  async findOrderForUpdate(id: string): Promise<ExchangeOrderEntity | null> {
    if (!isId(id)) {
      return null
    }
    const row = await this.db
      .selectFrom('exchange_order')
      .selectAll()
      .where('id', '=', id)
      .forUpdate()
      .executeTakeFirst()
    return row ? this.buildOrder(row) : null
  }

  async countOpenByCity(city_id: string): Promise<number> {
    const result = await this.db
      .selectFrom('exchange_order')
      .select(({ fn }) => fn.countAll<number>().as('count'))
      .where('city_id', '=', city_id)
      .where('status', '=', ExchangeOrderStatus.OPEN)
      .executeTakeFirstOrThrow()
    return Number(result.count)
  }

  async listOpenByCityForUpdate(city_id: string): Promise<ExchangeOrderEntity[]> {
    const rows = await this.db
      .selectFrom('exchange_order')
      .selectAll()
      .where('city_id', '=', city_id)
      .where('status', '=', ExchangeOrderStatus.OPEN)
      .orderBy('created_at', 'asc')
      .forUpdate()
      .execute()
    return rows.map(row => this.buildOrder(row))
  }

  async listOpenByPlayer(player_id: string): Promise<ExchangeOrderEntity[]> {
    const rows = await this.db
      .selectFrom('exchange_order')
      .selectAll()
      .where('player_id', '=', player_id)
      .where('status', '=', ExchangeOrderStatus.OPEN)
      .orderBy('created_at', 'desc')
      .execute()
    return rows.map(row => this.buildOrder(row))
  }

  async listClosedByPlayer({
    player_id,
    limit
  }: {
    player_id: string
    limit: number
  }): Promise<ExchangeOrderEntity[]> {
    const rows = await this.db
      .selectFrom('exchange_order')
      .selectAll()
      .where('player_id', '=', player_id)
      .where('status', '!=', ExchangeOrderStatus.OPEN)
      .orderBy('closed_at', 'desc')
      .limit(limit)
      .execute()
    return rows.map(row => this.buildOrder(row))
  }

  async listOpenCreatedBefore(before: number): Promise<ExchangeOrderEntity[]> {
    const rows = await this.db
      .selectFrom('exchange_order')
      .selectAll()
      .where('status', '=', ExchangeOrderStatus.OPEN)
      .where('created_at', '<', toTimestampRequired(before))
      .orderBy('created_at', 'asc')
      .execute()
    return rows.map(row => this.buildOrder(row))
  }

  async listMatchableForUpdate({
    faction_code,
    resource,
    side,
    limit_price,
    exclude_player_id
  }: {
    faction_code: FactionCode
    resource: ExchangeResource
    side: ExchangeSide
    limit_price: number
    exclude_player_id: string
  }): Promise<ExchangeOrderEntity[]> {
    // Resting sells cross a buy at or below its limit; resting buys cross a sell at or above it.
    const is_sell_book = side === ExchangeSide.SELL
    const rows = await this.db
      .selectFrom('exchange_order')
      .selectAll()
      .where('faction_code', '=', faction_code)
      .where('resource', '=', resource)
      .where('side', '=', side)
      .where('status', '=', ExchangeOrderStatus.OPEN)
      .where('price', is_sell_book ? '<=' : '>=', limit_price)
      .where('player_id', '!=', exclude_player_id)
      .orderBy('price', is_sell_book ? 'asc' : 'desc')
      .orderBy('created_at', 'asc')
      .orderBy('id', 'asc')
      .forUpdate()
      .execute()
    return rows.map(row => this.buildOrder(row))
  }

  async getBook({
    faction_code,
    resource,
    depth
  }: {
    faction_code: FactionCode
    resource: ExchangeResource
    depth: number
  }): Promise<{ bids: ExchangeBookLevel[], asks: ExchangeBookLevel[] }> {
    const levels = (side: ExchangeSide) => this.db
      .selectFrom('exchange_order')
      .select(({ fn }) => [
        'price',
        fn.sum<number>(sql<number>`lots - filled_lots`).as('lots'),
      ])
      .where('faction_code', '=', faction_code)
      .where('resource', '=', resource)
      .where('side', '=', side)
      .where('status', '=', ExchangeOrderStatus.OPEN)
      .groupBy('price')
      .orderBy('price', side === ExchangeSide.BUY ? 'desc' : 'asc')
      .limit(depth)
      .execute()

    const [
      bid_rows,
      ask_rows
    ] = await Promise.all([
      levels(ExchangeSide.BUY),
      levels(ExchangeSide.SELL),
    ])
    const toLevel = (row: { price: number, lots: number | string }): ExchangeBookLevel => ({
      price: row.price,
      lots: Number(row.lots),
    })
    return {
      bids: bid_rows.map(toLevel),
      asks: ask_rows.map(toLevel),
    }
  }

  async listTrades({
    faction_code,
    resource,
    limit
  }: {
    faction_code: FactionCode
    resource: ExchangeResource
    limit: number
  }): Promise<ExchangeTradeView[]> {
    const rows = await this.db
      .selectFrom('exchange_trade')
      .select([
        'price',
        'lots',
        'executed_at'
      ])
      .where('faction_code', '=', faction_code)
      .where('resource', '=', resource)
      .orderBy('executed_at', 'desc')
      .orderBy('seq', 'desc')
      .limit(limit)
      .execute()
    return rows.map(row => ({
      price: row.price,
      lots: row.lots,
      executed_at: fromTimestampRequired(row.executed_at),
    }))
  }

  async createTrade(trade: ExchangeTradeRecord): Promise<void> {
    await this.db
      .insertInto('exchange_trade')
      .values({
        id: trade.id,
        faction_code: trade.faction_code,
        resource: trade.resource,
        buy_order_id: trade.buy_order_id,
        sell_order_id: trade.sell_order_id,
        lots: trade.lots,
        price: trade.price,
        executed_at: toTimestampRequired(trade.executed_at),
      })
      .execute()
  }

  async findTradeParties(trade_id: string): Promise<ExchangeTradeParties | null> {
    if (!isId(trade_id)) {
      return null
    }
    const row = await this.db
      .selectFrom('exchange_trade')
      .innerJoin('exchange_order as buy', 'buy.id', 'exchange_trade.buy_order_id')
      .innerJoin('exchange_order as sell', 'sell.id', 'exchange_trade.sell_order_id')
      .selectAll('exchange_trade')
      .select([
        'buy.player_id as buyer_player_id',
        'buy.city_id as buyer_city_id',
        'sell.player_id as seller_player_id',
        'sell.city_id as seller_city_id',
      ])
      .where('exchange_trade.id', '=', trade_id)
      .executeTakeFirst()
    if (!row) {
      return null
    }
    return {
      id: row.id,
      faction_code: row.faction_code as FactionCode,
      resource: row.resource as ExchangeResource,
      buy_order_id: row.buy_order_id,
      sell_order_id: row.sell_order_id,
      lots: row.lots,
      price: row.price,
      executed_at: fromTimestampRequired(row.executed_at),
      buyer_player_id: row.buyer_player_id,
      buyer_city_id: row.buyer_city_id,
      seller_player_id: row.seller_player_id,
      seller_city_id: row.seller_city_id,
    }
  }

  async listReservations(order_id: string): Promise<CarrierReservation[]> {
    const rows = await this.db
      .selectFrom('exchange_carrier_reservation')
      .select([
        'troop_code',
        'count'
      ])
      .where('order_id', '=', order_id)
      .execute()
    return rows.map(row => ({
      troop_code: row.troop_code as TroopCode,
      count: row.count,
    }))
  }

  async saveReservations({
    order_id,
    reservations
  }: {
    order_id: string
    reservations: CarrierReservation[]
  }): Promise<void> {
    await this.db
      .deleteFrom('exchange_carrier_reservation')
      .where('order_id', '=', order_id)
      .execute()
    const rows = reservations
      .filter(reservation => reservation.count > 0)
      .map(reservation => ({
        order_id,
        troop_code: reservation.troop_code,
        count: reservation.count,
      }))
    if (rows.length === 0) {
      return
    }
    await this.db
      .insertInto('exchange_carrier_reservation')
      .values(rows)
      .execute()
  }

  async listReservedInCell({
    cell_id,
    player_id
  }: {
    cell_id: string
    player_id: string
  }): Promise<CarrierReservation[]> {
    const rows = await this.db
      .selectFrom('exchange_carrier_reservation')
      .innerJoin('exchange_order', 'exchange_order.id', 'exchange_carrier_reservation.order_id')
      .innerJoin('city', 'city.id', 'exchange_order.city_id')
      .select(({ fn }) => [
        'exchange_carrier_reservation.troop_code',
        fn.sum<number>('exchange_carrier_reservation.count').as('count'),
      ])
      .where('city.cell_id', '=', cell_id)
      .where('exchange_order.player_id', '=', player_id)
      .where('exchange_order.status', '=', ExchangeOrderStatus.OPEN)
      .groupBy('exchange_carrier_reservation.troop_code')
      .execute()
    return rows.map(row => ({
      troop_code: row.troop_code as TroopCode,
      count: Number(row.count),
    }))
  }

  async listFactionCityCoordinates({
    faction_code,
    exclude_player_id
  }: {
    faction_code: FactionCode
    exclude_player_id: string
  }): Promise<Coordinates[]> {
    const rows = await this.db
      .selectFrom('city')
      .innerJoin('player', 'player.id', 'city.player_id')
      .innerJoin('cell', 'cell.id', 'city.cell_id')
      .select([
        'cell.x',
        'cell.y'
      ])
      .where('player.faction_code', '=', faction_code)
      .where('player.system_controlled', '=', false)
      .where('player.id', '!=', exclude_player_id)
      .execute()
    return rows.map(row => ({
      x: row.x,
      y: row.y
    }))
  }

  private buildOrder(row: Selectable<DB['exchange_order']>): ExchangeOrderEntity {
    return ExchangeOrderEntity.create({
      id: row.id,
      player_id: row.player_id,
      faction_code: row.faction_code as FactionCode,
      city_id: row.city_id,
      side: row.side as ExchangeSide,
      resource: row.resource as ExchangeResource,
      lots: row.lots,
      filled_lots: row.filled_lots,
      price: row.price,
      status: row.status as ExchangeOrderStatus,
      created_at: fromTimestampRequired(row.created_at),
      closed_at: fromTimestamp(row.closed_at),
    })
  }
}

import { ExchangeOrderEntity } from '#core/exchange/entity'
import {
  CarrierReservation,
  ExchangeBookLevel,
  ExchangeTradeView
} from '#core/exchange/type'
import { ExchangeResource } from '#core/exchange/value/resource'
import { ExchangeSide } from '#core/exchange/value/side'
import { FactionCode } from '#core/faction/constant/code'
import { Coordinates } from '#core/world/value/coordinates'

export interface ExchangeTradeRecord {
  id: string
  faction_code: FactionCode
  resource: ExchangeResource
  buy_order_id: string
  sell_order_id: string
  lots: number
  price: number
  executed_at: number
}

/** A trade with both parties' order player and city, for convoy arrival (slice 035). */
export interface ExchangeTradeParties extends ExchangeTradeRecord {
  buyer_player_id: string
  buyer_city_id: string
  seller_player_id: string
  seller_city_id: string
}

export interface ExchangeRepository {
  createOrder(order: ExchangeOrderEntity): Promise<void>
  /** Writes `filled_lots`, `status` and `closed_at`. */
  updateOrder(order: ExchangeOrderEntity): Promise<void>
  findOrder(id: string): Promise<ExchangeOrderEntity | null>
  /** Locks the order row until the transaction ends. */
  findOrderForUpdate(id: string): Promise<ExchangeOrderEntity | null>

  countOpenByCity(city_id: string): Promise<number>
  /** Open orders of the city, row-locked until the transaction ends (city capture, slice 035). */
  listOpenByCityForUpdate(city_id: string): Promise<ExchangeOrderEntity[]>
  listOpenByPlayer(player_id: string): Promise<ExchangeOrderEntity[]>
  listClosedByPlayer(query: { player_id: string, limit: number }): Promise<ExchangeOrderEntity[]>
  /** Open orders created before `before` (expiry job). */
  listOpenCreatedBefore(before: number): Promise<ExchangeOrderEntity[]>

  /**
   * Open orders of the book that an incoming order can match, in price-time priority, row-locked until the
   * transaction ends: other players' orders on `side` of the faction's `resource` book whose price crosses
   * `limit_price` (≤ for sells to a buyer, ≥ for buys to a seller).
   */
  listMatchableForUpdate(query: {
    faction_code: FactionCode
    resource: ExchangeResource
    side: ExchangeSide
    limit_price: number
    exclude_player_id: string
  }): Promise<ExchangeOrderEntity[]>

  /** Top `depth` price levels per side with their total remaining lots: bids high to low, asks low to high. */
  getBook(query: {
    faction_code: FactionCode
    resource: ExchangeResource
    depth: number
  }): Promise<{ bids: ExchangeBookLevel[], asks: ExchangeBookLevel[] }>

  listTrades(query: {
    faction_code: FactionCode
    resource: ExchangeResource
    limit: number
  }): Promise<ExchangeTradeView[]>

  createTrade(trade: ExchangeTradeRecord): Promise<void>
  findTradeParties(trade_id: string): Promise<ExchangeTradeParties | null>

  listReservations(order_id: string): Promise<CarrierReservation[]>
  /** Replaces the order's reservation rows (zero counts dropped). */
  saveReservations(query: { order_id: string, reservations: CarrierReservation[] }): Promise<void>
  /** Carriers reserved by the player's open orders of every city on the cell. */
  listReservedInCell(query: { cell_id: string, player_id: string }): Promise<CarrierReservation[]>

  /** Coordinates of the faction's cities owned by other human players (delivery estimate). */
  listFactionCityCoordinates(query: { faction_code: FactionCode, exclude_player_id: string }): Promise<Coordinates[]>
}

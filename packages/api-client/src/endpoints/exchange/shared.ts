import { ExchangeOrderStatus } from '@server-core/exchange/value/order-status'
import { ExchangeResource } from '@server-core/exchange/value/resource'
import { ExchangeSide } from '@server-core/exchange/value/side'
import { TroopCode } from '@server-core/troop/constant/code'
import { Resource } from '../shared/resource'

export interface ExchangeCarrierCount {
  code: TroopCode
  count: number
}

export interface ExchangeOrder {
  id: string
  city_id: string
  /** Empty when the city now belongs to someone else. */
  city_name: string
  side: ExchangeSide
  resource: ExchangeResource
  lots: number
  filled_lots: number
  /** Water per lot. */
  price: number
  status: ExchangeOrderStatus
  created_at: number
  closed_at: number | null
  expires_at: number
  /** Open orders: escrow still held for the unfilled lots; `null` once closed. */
  reserved_resources: Resource | null
  /** Open orders: carriers still reserved ("réservés pour la bourse"). */
  reserved_carriers: ExchangeCarrierCount[]
}

export interface ExchangeOrderInput {
  city_id: string
  side: ExchangeSide
  resource: ExchangeResource
  lots: number
  price: number
}

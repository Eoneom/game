import assert from 'assert'

import { EXCHANGE_ORDER_LIFETIME_MS } from '#core/exchange/constant/limits'
import { ExchangeOrderStatus } from '#core/exchange/value/order-status'
import { ExchangeResource } from '#core/exchange/value/resource'
import { ExchangeSide } from '#core/exchange/value/side'
import { FactionCode } from '#core/faction/constant/code'
import { BaseEntity } from '#core/type/base/entity'
import { id } from '#shared/identification'

type ExchangeOrderEntityProps = BaseEntity & {
  player_id: string
  faction_code: FactionCode
  city_id: string
  side: ExchangeSide
  resource: ExchangeResource
  lots: number
  filled_lots: number
  price: number
  status: ExchangeOrderStatus
  created_at: number
  closed_at: number | null
}

/** A limit order on the faction exchange (slice 035): `lots` of `resource` at `price` water per lot. */
export class ExchangeOrderEntity extends BaseEntity {
  readonly player_id: string
  readonly faction_code: FactionCode
  readonly city_id: string
  readonly side: ExchangeSide
  readonly resource: ExchangeResource
  readonly lots: number
  readonly filled_lots: number
  readonly price: number
  readonly status: ExchangeOrderStatus
  readonly created_at: number
  readonly closed_at: number | null

  private constructor(props: ExchangeOrderEntityProps) {
    super({ id: props.id })

    this.player_id = props.player_id
    this.faction_code = props.faction_code
    this.city_id = props.city_id
    this.side = props.side
    this.resource = props.resource
    this.lots = props.lots
    this.filled_lots = props.filled_lots
    this.price = props.price
    this.status = props.status
    this.created_at = props.created_at
    this.closed_at = props.closed_at
  }

  static create(props: ExchangeOrderEntityProps): ExchangeOrderEntity {
    return new ExchangeOrderEntity(props)
  }

  static place({
    player_id,
    faction_code,
    city_id,
    side,
    resource,
    lots,
    price,
    created_at,
  }: {
    player_id: string
    faction_code: FactionCode
    city_id: string
    side: ExchangeSide
    resource: ExchangeResource
    lots: number
    price: number
    created_at: number
  }): ExchangeOrderEntity {
    return new ExchangeOrderEntity({
      id: id(),
      player_id,
      faction_code,
      city_id,
      side,
      resource,
      lots,
      filled_lots: 0,
      price,
      status: ExchangeOrderStatus.OPEN,
      created_at,
      closed_at: null,
    })
  }

  get remaining_lots(): number {
    return this.lots - this.filled_lots
  }

  get expires_at(): number {
    return this.created_at + EXCHANGE_ORDER_LIFETIME_MS
  }

  isOpen(): boolean {
    return this.status === ExchangeOrderStatus.OPEN
  }

  isOwnedBy(player_id: string): boolean {
    return this.player_id === player_id
  }

  /** Records a partial or complete fill; the order closes as `filled` with its last lot. */
  fill({
    lots,
    filled_at
  }: {
    lots: number
    filled_at: number
  }): ExchangeOrderEntity {
    assert(this.isOpen())
    assert(lots >= 1 && lots <= this.remaining_lots)
    const filled_lots = this.filled_lots + lots
    const is_filled = filled_lots === this.lots
    return ExchangeOrderEntity.create({
      ...this,
      filled_lots,
      status: is_filled ? ExchangeOrderStatus.FILLED : ExchangeOrderStatus.OPEN,
      closed_at: is_filled ? filled_at : null,
    })
  }

  close({
    status,
    closed_at
  }: {
    status: ExchangeOrderStatus.CANCELLED | ExchangeOrderStatus.EXPIRED
    closed_at: number
  }): ExchangeOrderEntity {
    assert(this.isOpen())
    return ExchangeOrderEntity.create({
      ...this,
      status,
      closed_at,
    })
  }
}

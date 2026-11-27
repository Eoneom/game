import { exchange_lot_size } from '#core/exchange/constant/lot'
import { EXCHANGE_MAX_INTEGER } from '#core/exchange/constant/limits'
import { ExchangeOrderEntity } from '#core/exchange/entity'
import { ExchangeError } from '#core/exchange/error'
import {
  CarrierReservation,
  ConvoyCarriers
} from '#core/exchange/type'
import {
  ExchangeResource,
  isExchangeResource
} from '#core/exchange/value/resource'
import {
  ExchangeSide,
  isExchangeSide
} from '#core/exchange/value/side'
import { TroopCode } from '#core/troop/constant/code'
import { TroopRole } from '#core/troop/constant/role'
import { TroopService } from '#core/troop/service'
import { TroopCount } from '#core/troop/type'
import { Resource } from '#shared/resource'

const EMPTY_RESOURCES: Resource = {
  plastic: 0,
  mushroom: 0,
  plasma: 0,
  water: 0,
}

interface ExchangeOrderInput {
  side: ExchangeSide
  resource: ExchangeResource
  lots: number
  price: number
}

/** Who rests in the book, as seen by the matching loop. */
interface RestingOrderView {
  id: string
  price: number
  created_at: number
  remaining_lots: number
}

const isBoundedPositiveInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= EXCHANGE_MAX_INTEGER

export class ExchangeService {
  static lotSize(resource: ExchangeResource): number {
    return exchange_lot_size[resource]
  }

  /** `side` and `resource` known, `lots` and `price` integers ≥ 1. */
  static assertOrderInput(input: {
    side: unknown
    resource: unknown
    lots: unknown
    price: unknown
  }): ExchangeOrderInput {
    const {
      side, resource, lots, price
    } = input
    if (!isExchangeSide(side) || !isExchangeResource(resource) || !isBoundedPositiveInteger(lots) || !isBoundedPositiveInteger(price)) {
      throw new Error(ExchangeError.ORDER_INVALID)
    }
    return {
      side,
      resource,
      lots,
      price
    }
  }

  /** Goods a seller ships for `lots`. */
  static goods({
    resource,
    lots
  }: {
    resource: ExchangeResource
    lots: number
  }): Resource {
    return {
      ...EMPTY_RESOURCES,
      [resource]: lots * this.lotSize(resource),
    }
  }

  /** Water a buyer pays for `lots` at `price`. */
  static payment({
    lots,
    price
  }: {
    lots: number
    price: number
  }): Resource {
    return {
      ...EMPTY_RESOURCES,
      water: lots * price,
    }
  }

  /** Escrow of `lots` of an order: the goods for a sell, the water at the limit price for a buy. */
  static escrow({
    side,
    resource,
    lots,
    price
  }: ExchangeOrderInput): Resource {
    return side === ExchangeSide.SELL
      ? this.goods({
        resource,
        lots
      })
      : this.payment({
        lots,
        price
      })
  }

  /** Escrow still held by an open order for its unfilled lots. */
  static remainingEscrow(order: ExchangeOrderEntity): Resource {
    return this.escrow({
      side: order.side,
      resource: order.resource,
      lots: order.remaining_lots,
      price: order.price,
    })
  }

  /** Water released to a buyer whose limit is above the execution price. */
  static priceImprovement({
    lots,
    limit_price,
    execution_price
  }: {
    lots: number
    limit_price: number
    execution_price: number
  }): number {
    return lots * Math.max(0, limit_price - execution_price)
  }

  static isCarrier(code: TroopCode): boolean {
    return TroopService.roleFor(code) === TroopRole.CARRIER && TroopService.getTransportCapacity(code) > 0
  }

  /** Carrier stacks with units, largest `transport_capacity` first (troop order breaks ties). */
  static carrierStacks(troops: TroopCount[]): TroopCount[] {
    return troops
      .filter(troop => troop.count > 0 && this.isCarrier(troop.code))
      .map(troop => ({
        code: troop.code,
        count: troop.count
      }))
      .sort((a, b) => TroopService.getTransportCapacity(b.code) - TroopService.getTransportCapacity(a.code)
        || TroopService.getOrder(a.code) - TroopService.getOrder(b.code))
  }

  /** Units per code held by reservations. */
  static reservedByCode(reservations: CarrierReservation[]): Map<TroopCode, number> {
    const reserved = new Map<TroopCode, number>()
    for (const reservation of reservations) {
      reserved.set(reservation.troop_code, (reserved.get(reservation.troop_code) ?? 0) + reservation.count)
    }
    return reserved
  }

  /** `available = stack count − reserved` (never negative after battle losses). */
  static availableTroops({
    troops,
    reservations
  }: {
    troops: TroopCount[]
    reservations: CarrierReservation[]
  }): TroopCount[] {
    const reserved = this.reservedByCode(reservations)
    return troops.map(troop => ({
      code: troop.code,
      count: Math.max(0, troop.count - (reserved.get(troop.code) ?? 0)),
    }))
  }

  /** Takes carriers from `stacks` (any order), largest capacity first, until `load` fits. */
  private static allocatePartial({
    stacks,
    load
  }: {
    stacks: TroopCount[]
    load: number
  }): { taken: TroopCount[], remaining_load: number } {
    let remaining_load = load
    const taken: TroopCount[] = []
    for (const stack of this.carrierStacks(stacks)) {
      if (remaining_load <= 0) {
        break
      }
      const capacity = TroopService.getTransportCapacity(stack.code)
      const count = Math.min(stack.count, Math.ceil(remaining_load / capacity))
      taken.push({
        code: stack.code,
        count
      })
      remaining_load -= count * capacity
    }
    return {
      taken,
      remaining_load: Math.max(0, remaining_load)
    }
  }

  /** Just enough carriers for `resources`, largest capacity first; `null` when the stacks cannot carry them. */
  static allocateCarriers({
    stacks,
    resources
  }: {
    stacks: TroopCount[]
    resources: Resource
  }): TroopCount[] | null {
    const {
      taken, remaining_load
    } = this.allocatePartial({
      stacks,
      load: TroopService.getTransportLoad({ resources })
    })
    return remaining_load > 0 ? null : taken
  }

  /**
   * Carriers of one convoy: just enough for `resources`, first from the order's reservation, then from the city's
   * free carriers when partial fills rounded the reservation down. `null` when neither can carry the cargo.
   */
  static convoyCarriers({
    reservations,
    free,
    resources
  }: {
    reservations: CarrierReservation[]
    free: TroopCount[]
    resources: Resource
  }): ConvoyCarriers | null {
    const from_reserved = this.allocatePartial({
      stacks: reservations.map(reservation => ({
        code: reservation.troop_code,
        count: reservation.count
      })),
      load: TroopService.getTransportLoad({ resources })
    })
    if (from_reserved.remaining_load <= 0) {
      return {
        from_reservation: from_reserved.taken,
        from_free: []
      }
    }
    const from_free = this.allocatePartial({
      stacks: free,
      load: from_reserved.remaining_load
    })
    if (from_free.remaining_load > 0) {
      return null
    }
    return {
      from_reservation: from_reserved.taken,
      from_free: from_free.taken
    }
  }

  /**
   * Keeps an open order's reservation able to carry its rest: when partial fills used it up, free carriers are added
   * for the shortfall, as far as the city has them (best effort).
   */
  static topUpReservations({
    reservations,
    free,
    resources
  }: {
    reservations: CarrierReservation[]
    free: TroopCount[]
    resources: Resource
  }): CarrierReservation[] {
    const capacity = TroopService.getTotalTransportCapacity({
      troops: reservations.map(reservation => ({
        code: reservation.troop_code,
        count: reservation.count
      }))
    })
    const shortfall = TroopService.getTransportLoad({ resources }) - capacity
    if (shortfall <= 0) {
      return reservations
    }
    const { taken } = this.allocatePartial({
      stacks: free,
      load: shortfall
    })
    return [
      ...this.reservedByCode([
        ...reservations,
        ...taken.map(troop => ({
          troop_code: troop.code,
          count: troop.count
        }))
      ]).entries() 
    ].map(([
      troop_code,
      count
    ]) => ({
      troop_code,
      count
    }))
  }

  static subtractReservations({
    reservations,
    used
  }: {
    reservations: CarrierReservation[]
    used: TroopCount[]
  }): CarrierReservation[] {
    return reservations
      .map(reservation => ({
        troop_code: reservation.troop_code,
        count: reservation.count - used
          .filter(troop => troop.code === reservation.troop_code)
          .reduce((total, troop) => total + troop.count, 0),
      }))
      .filter(reservation => reservation.count > 0)
  }

  /** Merges convoy carriers per code. */
  static convoyTroops(carriers: ConvoyCarriers): TroopCount[] {
    const merged = new Map<TroopCode, number>()
    for (const troop of [
      ...carriers.from_reservation,
      ...carriers.from_free
    ]) {
      merged.set(troop.code, (merged.get(troop.code) ?? 0) + troop.count)
    }
    return [ ...merged.entries() ].map(([
      code,
      count
    ]) => ({
      code,
      count
    }))
  }

  static oppositeSide(side: ExchangeSide): ExchangeSide {
    return side === ExchangeSide.BUY ? ExchangeSide.SELL : ExchangeSide.BUY
  }

  /** A buy matches a sell when `buy.price ≥ sell.price`. */
  static crosses({
    side,
    limit_price,
    resting_price
  }: {
    side: ExchangeSide
    limit_price: number
    resting_price: number
  }): boolean {
    return side === ExchangeSide.BUY ? limit_price >= resting_price : limit_price <= resting_price
  }

  /**
   * Price-time priority of resting orders for an incoming order of `side`: a buy takes the lowest sells first,
   * a sell the highest buys first, the oldest first at equal price.
   */
  static sortByPriority<T extends RestingOrderView>({
    side,
    resting
  }: {
    side: ExchangeSide
    resting: T[]
  }): T[] {
    const direction = side === ExchangeSide.BUY ? 1 : -1
    return [ ...resting ].sort((a, b) => direction * (a.price - b.price)
      || a.created_at - b.created_at
      || a.id.localeCompare(b.id))
  }

  /** Lots and execution price (the resting order's) of a fill, or `null` when the prices do not cross. */
  static fillTerms({
    side,
    limit_price,
    remaining_lots,
    resting
  }: {
    side: ExchangeSide
    limit_price: number
    remaining_lots: number
    resting: RestingOrderView
  }): { lots: number, price: number } | null {
    if (remaining_lots <= 0 || resting.remaining_lots <= 0) {
      return null
    }
    if (!this.crosses({
      side,
      limit_price,
      resting_price: resting.price
    })) {
      return null
    }
    return {
      lots: Math.min(remaining_lots, resting.remaining_lots),
      price: resting.price,
    }
  }
}

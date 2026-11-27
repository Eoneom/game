import { Factory } from '#adapter/factory'
import {
  emitExchangeBookUpdated,
  emitExchangeFills,
  ExchangeFill,
  runInExchangeMarket
} from '#app/command/exchange/shared'
import { runCommand } from '#command/run'
import { BuildingCode } from '#core/building/constant/code'
import { CityEntity } from '#core/city/entity'
import { CityError } from '#core/city/error'
import { ReportEntity } from '#core/communication/report/entity'
import { ReportType } from '#core/communication/value/report-type'
import { ExchangeOrderEntity } from '#core/exchange/entity'
import { ExchangeError } from '#core/exchange/error'
import { ExchangeService } from '#core/exchange/service'
import {
  CarrierReservation,
  ConvoyCarriers,
  ReportTradeMetadata
} from '#core/exchange/type'
import { ExchangeOrderStatus } from '#core/exchange/value/order-status'
import { ExchangeSide } from '#core/exchange/value/side'
import { MovementAction } from '#core/troop/constant/movement-action'
import { TroopEntity } from '#core/troop/entity'
import { TroopService } from '#core/troop/service'
import { TroopCount } from '#core/troop/type'
import { WorldService } from '#core/world/service'
import { Coordinates } from '#core/world/value/coordinates'
import {
  id,
  isId
} from '#shared/identification'
import { Resource } from '#shared/resource'
import { now } from '#shared/time'

interface PlaceExchangeOrderParams {
  player_id: string
  city_id: string
  side: unknown
  resource: unknown
  lots: unknown
  price: unknown
}

interface PlaceExchangeOrderResult {
  order_id: string
  status: ExchangeOrderStatus
  filled_lots: number
}

/**
 * `POST /exchange/order` (slice 035): checks, escrow of resources and carriers, then immediate matching against the
 * faction's book in price-time priority. Everything runs in one transaction under the market lock.
 */
export async function placeExchangeOrder(params: PlaceExchangeOrderParams): Promise<PlaceExchangeOrderResult> {
  const player = await Factory.getRepository().player.get(params.player_id)
  const market = {
    faction_code: player.faction_code,
    resource: String(params.resource),
  }

  const {
    result, fills, resource
  } = await runInExchangeMarket(market, () => runCommand('exchange:order:place', async () => {
    const repository = Factory.getRepository()
    const placed_at = now()

    // System players never trade (slice 035): they are refused like a city without a trading post.
    if (player.system_controlled) {
      throw new Error(ExchangeError.TRADING_POST_REQUIRED)
    }
    if (!isId(params.city_id)) {
      throw new Error(CityError.NOT_FOUND)
    }
    const city = await repository.city.get(params.city_id)
    if (!city.isOwnedBy(player.id)) {
      throw new Error(ExchangeError.TRADING_POST_REQUIRED)
    }
    const trading_post_level = await repository.building.getLevel({
      city_id: city.id,
      code: BuildingCode.TRADING_POST
    })
    if (trading_post_level < 1) {
      throw new Error(ExchangeError.TRADING_POST_REQUIRED)
    }

    const open_count = await repository.exchange.countOpenByCity(city.id)
    if (open_count >= trading_post_level) {
      throw new Error(ExchangeError.ORDER_LIMIT_REACHED)
    }

    const input = ExchangeService.assertOrderInput(params)
    const escrow = ExchangeService.escrow(input)

    const stock = await repository.resource_stock.getByCellId({ cell_id: city.cell_id })
    const updated_stock = stock.purchase({ resource: escrow })

    const {
      troops, cell_reservations
    } = await loadCityCarriers({
      cell_id: city.cell_id,
      player_id: player.id
    })
    const carriers = ExchangeService.allocateCarriers({
      stacks: ExchangeService.availableTroops({
        troops,
        reservations: cell_reservations
      }),
      resources: escrow,
    })
    if (!carriers) {
      throw new Error(ExchangeError.NOT_ENOUGH_CARRIERS)
    }

    const order = ExchangeOrderEntity.place({
      player_id: player.id,
      faction_code: player.faction_code,
      city_id: city.id,
      side: input.side,
      resource: input.resource,
      lots: input.lots,
      price: input.price,
      created_at: placed_at,
    })
    await repository.exchange.createOrder(order)
    await repository.exchange.saveReservations({
      order_id: order.id,
      reservations: carriers.map(carrier => ({
        troop_code: carrier.code,
        count: carrier.count
      })),
    })
    await repository.resource_stock.updateOne(updated_stock)

    const matched = await matchIncomingOrder({
      order,
      executed_at: placed_at
    })

    return {
      result: {
        order_id: matched.order.id,
        status: matched.order.status,
        filled_lots: matched.order.filled_lots,
      },
      fills: matched.fills,
      resource: order.resource,
    }
  }))

  emitExchangeFills(fills)
  emitExchangeBookUpdated([
    {
      faction_code: player.faction_code,
      resource
    }
  ])

  return result
}

interface OrderSide {
  order: ExchangeOrderEntity
  city: CityEntity
  coordinates: Coordinates
  troops: TroopEntity[]
  /** This order's reservation. */
  reservations: CarrierReservation[]
  /** Carriers of the city that no open order reserves. */
  free: TroopCount[]
}

async function loadCityCarriers({
  cell_id,
  player_id
}: {
  cell_id: string
  player_id: string
}): Promise<{ troops: TroopEntity[], cell_reservations: CarrierReservation[] }> {
  const repository = Factory.getRepository()
  const [
    troops,
    cell_reservations
  ] = await Promise.all([
    repository.troop.listInCell({
      cell_id,
      player_id
    }),
    repository.exchange.listReservedInCell({
      cell_id,
      player_id
    }),
  ])
  return {
    troops,
    cell_reservations
  }
}

async function loadOrderSide(order: ExchangeOrderEntity): Promise<OrderSide> {
  const repository = Factory.getRepository()
  const city = await repository.city.get(order.city_id)
  const [
    cell,
    {
      troops, cell_reservations 
    },
    reservations
  ] = await Promise.all([
    repository.cell.getById(city.cell_id),
    loadCityCarriers({
      cell_id: city.cell_id,
      player_id: order.player_id
    }),
    repository.exchange.listReservations(order.id),
  ])
  // Battle losses (slice 024) can leave a stack below what its orders reserve: an order holds at most the stack.
  const held = reservations.map(reservation => ({
    troop_code: reservation.troop_code,
    count: Math.min(reservation.count, troops.find(troop => troop.code === reservation.troop_code)?.count ?? 0),
  }))
  return {
    order,
    city,
    coordinates: cell.coordinates,
    troops,
    reservations: held,
    free: ExchangeService.availableTroops({
      troops,
      reservations: cell_reservations
    }),
  }
}

/**
 * Matches the incoming order against the resting orders it crosses: best price first, oldest first at equal price,
 * own orders skipped, execution at the resting price, partial fills. A resting order whose city cannot field the
 * carriers of a fill is skipped; matching stops when the incoming city cannot.
 */
async function matchIncomingOrder({
  order,
  executed_at,
}: {
  order: ExchangeOrderEntity
  executed_at: number
}): Promise<{ order: ExchangeOrderEntity, fills: ExchangeFill[] }> {
  const repository = Factory.getRepository()
  const resting_orders = ExchangeService.sortByPriority({
    side: order.side,
    resting: await repository.exchange.listMatchableForUpdate({
      faction_code: order.faction_code,
      resource: order.resource,
      side: ExchangeService.oppositeSide(order.side),
      limit_price: order.price,
      exclude_player_id: order.player_id,
    }),
  })

  let incoming = order
  const fills: ExchangeFill[] = []

  for (const resting of resting_orders) {
    const terms = ExchangeService.fillTerms({
      side: incoming.side,
      limit_price: incoming.price,
      remaining_lots: incoming.remaining_lots,
      resting,
    })
    if (!terms) {
      if (incoming.remaining_lots <= 0) {
        break
      }
      continue
    }

    const [
      incoming_side,
      resting_side
    ] = await Promise.all([
      loadOrderSide(incoming),
      loadOrderSide(resting),
    ])
    const outcome = await executeFill({
      incoming: incoming_side,
      resting: resting_side,
      lots: terms.lots,
      price: terms.price,
      executed_at,
    })
    if (outcome.status === 'incoming_blocked') {
      break
    }
    if (outcome.status === 'resting_blocked') {
      continue
    }

    incoming = outcome.incoming
    fills.push(...outcome.fills)
    if (incoming.remaining_lots <= 0) {
      break
    }
  }

  return {
    order: incoming,
    fills
  }
}

type FillOutcome =
  | { status: 'incoming_blocked' }
  | { status: 'resting_blocked' }
  | { status: 'filled', incoming: ExchangeOrderEntity, fills: ExchangeFill[] }

/**
 * One fill: the seller's convoy takes the goods to the buyer's city, the buyer's convoy takes the water to the
 * seller's city, each with just enough carriers; a buyer whose limit is above the execution price gets the
 * difference back. Both parties get a `trade` report.
 */
async function executeFill({
  incoming,
  resting,
  lots,
  price,
  executed_at,
}: {
  incoming: OrderSide
  resting: OrderSide
  lots: number
  price: number
  executed_at: number
}): Promise<FillOutcome> {
  const repository = Factory.getRepository()
  const seller = incoming.order.side === ExchangeSide.SELL ? incoming : resting
  const buyer = incoming.order.side === ExchangeSide.BUY ? incoming : resting

  const goods = ExchangeService.goods({
    resource: seller.order.resource,
    lots
  })
  const payment = ExchangeService.payment({
    lots,
    price
  })

  const seller_carriers = ExchangeService.convoyCarriers({
    reservations: seller.reservations,
    free: seller.free,
    resources: goods
  })
  const buyer_carriers = ExchangeService.convoyCarriers({
    reservations: buyer.reservations,
    free: buyer.free,
    resources: payment
  })
  const incoming_carriers = incoming === seller ? seller_carriers : buyer_carriers
  const resting_carriers = incoming === seller ? buyer_carriers : seller_carriers
  if (!incoming_carriers) {
    return { status: 'incoming_blocked' }
  }
  if (!resting_carriers) {
    return { status: 'resting_blocked' }
  }

  const trade_id = id()
  const filled_seller = seller.order.fill({
    lots,
    filled_at: executed_at
  })
  const filled_buyer = buyer.order.fill({
    lots,
    filled_at: executed_at
  })
  await Promise.all([
    repository.exchange.updateOrder(filled_seller),
    repository.exchange.updateOrder(filled_buyer),
  ])
  await repository.exchange.createTrade({
    id: trade_id,
    faction_code: seller.order.faction_code,
    resource: seller.order.resource,
    buy_order_id: buyer.order.id,
    sell_order_id: seller.order.id,
    lots,
    price,
    executed_at,
  })

  const seller_convoy = await sendConvoy({
    from: seller,
    to: buyer,
    carriers: seller_carriers as ConvoyCarriers,
    cargo: goods,
    trade_id,
    filled_order: filled_seller,
    executed_at,
  })
  const buyer_convoy = await sendConvoy({
    from: buyer,
    to: seller,
    carriers: buyer_carriers as ConvoyCarriers,
    cargo: payment,
    trade_id,
    filled_order: filled_buyer,
    executed_at,
  })

  const refunded_water = ExchangeService.priceImprovement({
    lots,
    limit_price: buyer.order.price,
    execution_price: price
  })
  if (refunded_water > 0) {
    const stock = await repository.resource_stock.getByCellId({ cell_id: buyer.city.cell_id })
    await repository.resource_stock.updateOne(stock.refund({
      resource: {
        plastic: 0,
        mushroom: 0,
        plasma: 0,
        water: refunded_water
      }
    }))
  }

  const reportFor = ({
    own, other, own_convoy, other_convoy, received, refunded
  }: {
    own: OrderSide
    other: OrderSide
    own_convoy: SentConvoy
    other_convoy: SentConvoy
    received: Resource
    refunded: number
  }) => {
    const metadata: ReportTradeMetadata = {
      order_id: own.order.id,
      side: own.order.side,
      resource: own.order.resource,
      lots,
      price,
      refunded_water: refunded,
      city: {
        id: own.city.id,
        name: own.city.name,
        coordinates: own.coordinates
      },
      counterparty_city: {
        id: other.city.id,
        name: other.city.name,
        coordinates: other.coordinates
      },
      outgoing_arrive_at: own_convoy.arrive_at,
      incoming_arrive_at: other_convoy.arrive_at,
    }
    return {
      report: ReportEntity.create({
        id: id(),
        type: ReportType.TRADE,
        was_read: false,
        player_id: own.order.player_id,
        recorded_at: executed_at,
        origin: own.coordinates,
        destination: other.coordinates,
        troops: own_convoy.troops,
        resources: received,
      }),
      trade_id,
      counterparty_player_id: other.order.player_id,
      metadata,
    }
  }

  await repository.report.createTradeReports([
    reportFor({
      own: seller,
      other: buyer,
      own_convoy: seller_convoy,
      other_convoy: buyer_convoy,
      received: payment,
      refunded: 0
    }),
    reportFor({
      own: buyer,
      other: seller,
      own_convoy: buyer_convoy,
      other_convoy: seller_convoy,
      received: goods,
      refunded: refunded_water
    }),
  ])

  return {
    status: 'filled',
    incoming: incoming === seller ? filled_seller : filled_buyer,
    fills: [
      filled_seller,
      filled_buyer
    ].map(filled => ({
      player_id: filled.player_id,
      order_id: filled.id,
      lots,
      price,
    })),
  }
}

interface SentConvoy {
  troops: TroopCount[]
  arrive_at: number
}

/**
 * Moves the convoy's carriers out of the city stack into an `exchange` movement (never counted toward the cap) and
 * updates the order's reservation: used carriers leave it, free carriers top it up when the rest is no longer
 * covered (best effort), and a filled order releases the rest.
 */
async function sendConvoy({
  from,
  to,
  carriers,
  cargo,
  trade_id,
  filled_order,
  executed_at,
}: {
  from: OrderSide
  to: OrderSide
  carriers: ConvoyCarriers
  cargo: Resource
  trade_id: string
  /** The order after this fill: its rest decides what stays reserved. */
  filled_order: ExchangeOrderEntity
  executed_at: number
}): Promise<SentConvoy> {
  const repository = Factory.getRepository()
  const job_queue = Factory.getJobQueue()
  const convoy_troops = ExchangeService.convoyTroops(carriers)

  const {
    movement, arrive_at 
  } = TroopService.createMovement({
    troops: convoy_troops,
    start_at: executed_at,
    distance: WorldService.getDistance({
      origin: from.coordinates,
      destination: to.coordinates
    }),
    origin: from.coordinates,
    destination: to.coordinates,
    player_id: from.order.player_id,
    action: MovementAction.EXCHANGE,
    resources: cargo,
    exchange_trade_id: trade_id,
  })
  await repository.movement.create(movement)

  const stack_updates = convoy_troops.map(convoy_troop => {
    const stack = from.troops.find(troop => troop.code === convoy_troop.code)
    if (!stack) {
      throw new Error(ExchangeError.NOT_ENOUGH_CARRIERS)
    }
    return stack.removeCount(convoy_troop.count)
  })
  const movement_troops = convoy_troops.map(convoy_troop => TroopEntity.create({
    id: id(),
    code: convoy_troop.code,
    player_id: from.order.player_id,
    cell_id: null,
    count: convoy_troop.count,
    movement_id: movement.id,
  }))
  await Promise.all([
    ...stack_updates.map(stack => repository.troop.updateOne(stack)),
    ...movement_troops.map(troop => repository.troop.create(troop)),
    repository.exchange.saveReservations({
      order_id: from.order.id,
      reservations: filled_order.isOpen()
        ? ExchangeService.topUpReservations({
          reservations: ExchangeService.subtractReservations({
            reservations: from.reservations,
            used: carriers.from_reservation
          }),
          free: ExchangeService.subtractReservations({
            reservations: from.free.map(troop => ({
              troop_code: troop.code,
              count: troop.count
            })),
            used: carriers.from_free
          }).map(reservation => ({
            code: reservation.troop_code,
            count: reservation.count
          })),
          resources: ExchangeService.remainingEscrow(filled_order),
        })
        : [],
    }),
  ])

  await job_queue.scheduleTroopMovementFinish({
    player_id: from.order.player_id,
    movement_id: movement.id,
    execute_at: arrive_at,
  })

  return {
    troops: convoy_troops,
    arrive_at
  }
}

import assert from 'assert'
import { Factory } from '#adapter/factory'
import { ExchangeWorld } from '#app/test-support/exchange-world'
import { ExchangeBookQuery } from '#query/exchange/book'
import { ExchangeEstimateQuery } from '#query/exchange/estimate'
import { ExchangeMineQuery } from '#query/exchange/mine'
import { ExchangeSummaryQuery } from '#query/exchange/summary'
import { ExchangeTradesQuery } from '#query/exchange/trades'
import { CityError } from '#core/city/error'
import { EXCHANGE_BOOK_DEPTH } from '#core/exchange/constant/limits'
import { ExchangeError } from '#core/exchange/error'
import { ExchangeOrderStatus } from '#core/exchange/value/order-status'
import { ExchangeResource } from '#core/exchange/value/resource'
import { ExchangeSide } from '#core/exchange/value/side'
import { FactionCode } from '#core/faction/constant/code'
import { TroopCode } from '#core/troop/constant/code'
import { TroopService } from '#core/troop/service'
import { WorldService } from '#core/world/service'

describe('exchange queries (slice 035)', () => {
  let world: ExchangeWorld

  beforeEach(() => {
    world = new ExchangeWorld()
    world.install()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('book and trades', () => {
    it('reads the caller\'s faction book only', async () => {
      const player = world.addPlayer({ faction_code: FactionCode.THE_ASH_LITURGY })
      const repository = world.repository()
      const getBook = vi.fn().mockResolvedValue({
        bids: [
          {
            price: 9,
            lots: 4,
            own_lots: 0
          }
        ],
        asks: []
      })
      const listTrades = vi.fn().mockResolvedValue([])
      repository.exchange.getBook = getBook
      repository.exchange.listTrades = listTrades
      vi.mocked(Factory.getRepository).mockReturnValue(repository)

      const book = await new ExchangeBookQuery().run({
        player_id: player.id,
        resource: 'plasma'
      })
      await new ExchangeTradesQuery().run({
        player_id: player.id,
        resource: 'plasma'
      })

      expect(book).toEqual({
        resource: ExchangeResource.PLASMA,
        bids: [
          {
            price: 9,
            lots: 4,
            own_lots: 0
          }
        ],
        asks: []
      })
      expect(getBook).toHaveBeenCalledWith({
        faction_code: FactionCode.THE_ASH_LITURGY,
        resource: ExchangeResource.PLASMA,
        depth: EXCHANGE_BOOK_DEPTH,
        viewer_player_id: player.id
      })
      expect(listTrades).toHaveBeenCalledWith({
        faction_code: FactionCode.THE_ASH_LITURGY,
        resource: ExchangeResource.PLASMA,
        limit: 50
      })
    })

    it('marks the caller\'s own unfilled lots on each level and keeps them in the totals (slice 046)', async () => {
      const player = world.addPlayer()
      const other = world.addPlayer()
      const city = world.addCity({ player })
      const other_city = world.addCity({ player: other })
      const own = world.addOrder({
        player,
        city,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASTIC,
        lots: 5,
        price: 14,
        created_at: 1
      })
      world.orders.set(own.id, own.fill({
        lots: 2,
        filled_at: 2
      }))
      world.addOrder({
        player: other,
        city: other_city,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASTIC,
        lots: 4,
        price: 14,
        created_at: 3
      })
      world.addOrder({
        player: other,
        city: other_city,
        side: ExchangeSide.BUY,
        resource: ExchangeResource.PLASTIC,
        lots: 6,
        price: 12,
        created_at: 4
      })

      const book = await new ExchangeBookQuery().run({
        player_id: player.id,
        resource: 'plastic'
      })

      expect(book.asks).toEqual([
        {
          price: 14,
          lots: 7,
          own_lots: 3
        }
      ])
      expect(book.bids).toEqual([
        {
          price: 12,
          lots: 6,
          own_lots: 0
        }
      ])
    })

    it('rejects an unknown pair', async () => {
      const player = world.addPlayer()
      await assert.rejects(() => new ExchangeBookQuery().run({
        player_id: player.id,
        resource: 'water'
      }), new RegExp(ExchangeError.RESOURCE_INVALID))
    })
  })

  describe('summary (slice 046)', () => {
    it('gives the best bid and ask of other players per pair, the lots at that price and the newest trade', async () => {
      const player = world.addPlayer()
      const other = world.addPlayer()
      const third = world.addPlayer()
      const city = world.addCity({ player })
      const other_city = world.addCity({ player: other })
      const third_city = world.addCity({ player: third })
      const order = (owner: typeof player, at: typeof city, side: ExchangeSide, resource: ExchangeResource, lots: number, price: number) => world.addOrder({
        player: owner,
        city: at,
        side,
        resource,
        lots,
        price,
        created_at: world.orders.size
      })
      // Plastic: best bid 12 (4 + 6 lots from two players), best ask 14; the caller's better prices are ignored.
      order(other, other_city, ExchangeSide.BUY, ExchangeResource.PLASTIC, 4, 12)
      order(third, third_city, ExchangeSide.BUY, ExchangeResource.PLASTIC, 6, 12)
      order(other, other_city, ExchangeSide.BUY, ExchangeResource.PLASTIC, 9, 11)
      order(other, other_city, ExchangeSide.SELL, ExchangeResource.PLASTIC, 8, 14)
      order(third, third_city, ExchangeSide.SELL, ExchangeResource.PLASTIC, 2, 15)
      order(player, city, ExchangeSide.BUY, ExchangeResource.PLASTIC, 1, 13)
      order(player, city, ExchangeSide.SELL, ExchangeResource.PLASTIC, 1, 13)
      // Plasma: asks only.
      order(other, other_city, ExchangeSide.SELL, ExchangeResource.PLASMA, 3, 40)
      // A filled order no longer rests in the book.
      const filled = order(third, third_city, ExchangeSide.SELL, ExchangeResource.PLASMA, 1, 30)
      world.orders.set(filled.id, filled.fill({
        lots: 1,
        filled_at: 5
      }))
      world.trades.push({
        id: 't1',
        faction_code: player.faction_code,
        resource: ExchangeResource.PLASMA,
        buy_order_id: 'b',
        sell_order_id: filled.id,
        lots: 1,
        price: 30,
        executed_at: 5
      }, {
        id: 't2',
        faction_code: player.faction_code,
        resource: ExchangeResource.PLASMA,
        buy_order_id: 'b',
        sell_order_id: filled.id,
        lots: 1,
        price: 31,
        executed_at: 9
      })

      const { pairs } = await new ExchangeSummaryQuery().run({ player_id: player.id })

      expect(pairs).toEqual([
        {
          resource: ExchangeResource.PLASTIC,
          best_bid: {
            price: 12,
            lots: 10,
            own_lots: 0
          },
          best_ask: {
            price: 14,
            lots: 8,
            own_lots: 0
          },
          last_trade: null,
        },
        {
          resource: ExchangeResource.MUSHROOM,
          best_bid: null,
          best_ask: null,
          last_trade: null
        },
        {
          resource: ExchangeResource.PLASMA,
          best_bid: null,
          best_ask: {
            price: 40,
            lots: 3,
            own_lots: 0
          },
          last_trade: {
            price: 31,
            executed_at: 9
          },
        },
      ])
    })

    it('never mixes another faction\'s book', async () => {
      const player = world.addPlayer({ faction_code: FactionCode.THE_CONFEDERATION })
      const foreigner = world.addPlayer({ faction_code: FactionCode.THE_ASH_LITURGY })
      world.addOrder({
        player: foreigner,
        city: world.addCity({ player: foreigner }),
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASTIC,
        lots: 5,
        price: 1,
        created_at: 1
      })
      world.trades.push({
        id: 't',
        faction_code: FactionCode.THE_ASH_LITURGY,
        resource: ExchangeResource.PLASTIC,
        buy_order_id: 'b',
        sell_order_id: 's',
        lots: 1,
        price: 1,
        executed_at: 1
      })

      const { pairs } = await new ExchangeSummaryQuery().run({ player_id: player.id })

      expect(pairs.map(pair => pair.resource)).toEqual(Object.values(ExchangeResource))
      expect(pairs.every(pair => !pair.best_bid && !pair.best_ask && !pair.last_trade)).toBe(true)
    })

    it('drops levels of pairs it does not know and asks the repository with the caller excluded', async () => {
      const player = world.addPlayer()
      const repository = world.repository()
      const bestLevels = vi.fn().mockResolvedValue([
        {
          resource: 'water',
          side: ExchangeSide.BUY,
          price: 99,
          lots: 1
        },
        {
          resource: ExchangeResource.MUSHROOM,
          side: ExchangeSide.BUY,
          price: 7,
          lots: 2
        },
      ])
      repository.exchange.bestLevels = bestLevels
      vi.mocked(Factory.getRepository).mockReturnValue(repository)

      const { pairs } = await new ExchangeSummaryQuery().run({ player_id: player.id })

      expect(bestLevels).toHaveBeenCalledWith({
        faction_code: player.faction_code,
        exclude_player_id: player.id
      })
      expect(pairs).toHaveLength(3)
      expect(pairs[1].best_bid).toEqual({
        price: 7,
        lots: 2,
        own_lots: 0
      })
      expect(pairs[0].best_bid).toBeNull()
    })
  })

  describe('mine', () => {
    it('lists open orders with their escrow and reserved carriers, and closed orders', async () => {
      const player = world.addPlayer()
      const city = world.addCity({
        player,
        carriers: 2
      })
      const open = world.addOrder({
        player,
        city,
        side: ExchangeSide.BUY,
        resource: ExchangeResource.MUSHROOM,
        lots: 3,
        price: 7,
        created_at: 10,
        carriers: 1
      })
      const closed = world.addOrder({
        player,
        city,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASTIC,
        lots: 1,
        price: 2,
        created_at: 5
      })
      world.orders.set(closed.id, closed.fill({
        lots: 1,
        filled_at: 20
      }))

      const result = await new ExchangeMineQuery().run({ player_id: player.id })

      expect(result.open).toHaveLength(1)
      expect(result.open[0]).toMatchObject({
        order: { id: open.id },
        city_name: city.name,
        reserved_resources: { water: 21 },
        reserved_carriers: [
          {
            troop_code: TroopCode.LIGHT_TRANSPORTER,
            count: 1
          }
        ],
      })
      expect(result.closed.map(entry => entry.order.id)).toEqual([ closed.id ])
      expect(result.closed[0].reserved_resources).toBeNull()
    })

    it('lists the caller\'s trading-post cities by name with their open order counts (slice 046)', async () => {
      const player = world.addPlayer()
      const zulu = world.addCity({
        player,
        name: 'Zulu',
        trading_post: 3
      })
      const alpha = world.addCity({
        player,
        name: 'Alpha',
        trading_post: 1
      })
      world.addCity({
        player,
        trading_post: 0
      })
      // A captured city now belongs to someone else: it is not the caller's trading post anymore.
      const captured = world.addCity({
        player: world.addPlayer(),
        trading_post: 2
      })
      const order = (city: typeof alpha, created_at: number) => world.addOrder({
        player,
        city,
        side: ExchangeSide.BUY,
        resource: ExchangeResource.PLASTIC,
        lots: 1,
        price: 1,
        created_at
      })
      order(zulu, 1)
      order(zulu, 2)
      const cancelled = order(alpha, 3)
      world.orders.set(cancelled.id, cancelled.close({
        status: ExchangeOrderStatus.CANCELLED,
        closed_at: 4
      }))
      order(captured, 5)

      const { trading_posts } = await new ExchangeMineQuery().run({ player_id: player.id })

      expect(trading_posts).toEqual([
        {
          city_id: alpha.id,
          city_name: 'Alpha',
          level: 1,
          open_order_count: 0
        },
        {
          city_id: zulu.id,
          city_name: 'Zulu',
          level: 3,
          open_order_count: 2
        },
      ])
    })
  })

  describe('estimate', () => {
    it('previews the escrow, the carriers and the delivery time to a typical faction city', async () => {
      const player = world.addPlayer()
      const city = world.addCity({
        player,
        x: 0,
        trading_post: 2,
        stock: { water: 50 },
        carriers: 3
      })
      const neighbour = world.addPlayer()
      world.addCity({
        player: neighbour,
        x: 4
      })
      world.addCity({
        player: neighbour,
        x: 10
      })
      world.addCity({
        player: world.addPlayer(),
        x: 30
      })

      const estimate = await new ExchangeEstimateQuery().run({
        player_id: player.id,
        city_id: city.id,
        side: ExchangeSide.BUY,
        resource: ExchangeResource.PLASTIC,
        lots: 10,
        price: 8
      })

      expect(estimate).toMatchObject({
        reserved_resources: { water: 80 },
        enough_resources: false,
        reserved_carriers: [
          {
            code: TroopCode.LIGHT_TRANSPORTER,
            count: 1
          }
        ],
        open_order_count: 0,
        open_order_limit: 2,
      })
      // Median of 4, 10 and 30 cells; a Confederation convoy gets the logistics speed bonus (slice 039).
      expect(estimate.typical_delivery_duration).toBe(TroopService.getMovementDuration({
        distance: WorldService.getDistance({
          origin: {
            x: 0,
            y: 0
          },
          destination: {
            x: 10,
            y: 0
          }
        }),
        troop_codes: [ TroopCode.LIGHT_TRANSPORTER ],
        non_combat_speed_multiplier: 1.05,
      }))
    })

    it('weighs the payload against the free carriers with the Confederation bonus (slice 046)', async () => {
      const player = world.addPlayer({ faction_code: FactionCode.THE_CONFEDERATION })
      const city = world.addCity({
        player,
        trading_post: 3,
        stock: { water: 500 },
        carriers: 3
      })
      // One carrier already held by an open order: two stay free.
      world.addOrder({
        player,
        city,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.MUSHROOM,
        lots: 1,
        price: 5,
        created_at: 1,
        carriers: 1
      })

      const estimate = await new ExchangeEstimateQuery().run({
        player_id: player.id,
        city_id: city.id,
        side: ExchangeSide.BUY,
        resource: ExchangeResource.PLASTIC,
        lots: 10,
        price: 8
      })

      // 80 water weigh 2 each; light transporters carry 10 000 × 1.10.
      expect(estimate.carrier_load).toBe(160)
      expect(estimate.available_carrier_capacity).toBe(2 * 11000)
      expect(estimate.open_order_count).toBe(1)
    })

    it('previews the immediate fill in price-time priority at the resting prices, own orders skipped (slice 046)', async () => {
      const player = world.addPlayer()
      const city = world.addCity({
        player,
        stock: { water: 500 },
        carriers: 5
      })
      const seller = world.addPlayer()
      const seller_city = world.addCity({ player: seller })
      const sell = (owner: typeof player, at: typeof city, lots: number, price: number, created_at: number) => world.addOrder({
        player: owner,
        city: at,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASTIC,
        lots,
        price,
        created_at,
        carriers: 0
      })
      sell(seller, seller_city, 4, 7, 2)
      sell(seller, seller_city, 5, 8, 3)
      sell(seller, seller_city, 3, 8, 1)
      sell(seller, seller_city, 9, 9, 0)
      sell(player, city, 9, 6, 0)

      const repository = world.repository()
      const listMatchableForUpdate = vi.spyOn(repository.exchange, 'listMatchableForUpdate')
      const createOrder = vi.spyOn(repository.exchange, 'createOrder')
      const updateOrder = vi.spyOn(repository.exchange, 'updateOrder')
      const saveReservations = vi.spyOn(repository.exchange, 'saveReservations')
      const updateStock = vi.spyOn(repository.resource_stock, 'updateOne')
      vi.mocked(Factory.getRepository).mockReturnValue(repository)
      const before = [ ...world.orders.values() ]

      const estimate = await new ExchangeEstimateQuery().run({
        player_id: player.id,
        city_id: city.id,
        side: ExchangeSide.BUY,
        resource: ExchangeResource.PLASTIC,
        lots: 10,
        price: 8
      })

      // 4 at 7, then the older 3 at 8, then 3 of the 5 at 8; the own sell at 6 and the sell at 9 never fill.
      expect(estimate.immediate_fill).toEqual({
        lots: 10,
        water: 4 * 7 + 3 * 8 + 3 * 8
      })
      expect(listMatchableForUpdate).not.toHaveBeenCalled()
      expect(createOrder).not.toHaveBeenCalled()
      expect(updateOrder).not.toHaveBeenCalled()
      expect(saveReservations).not.toHaveBeenCalled()
      expect(updateStock).not.toHaveBeenCalled()
      expect([ ...world.orders.values() ]).toEqual(before)
    })

    it('previews no immediate fill when nothing crosses (slice 046)', async () => {
      const player = world.addPlayer()
      const city = world.addCity({
        player,
        stock: { plastic: 1000 },
        carriers: 1
      })
      const buyer = world.addPlayer()
      world.addOrder({
        player: buyer,
        city: world.addCity({ player: buyer }),
        side: ExchangeSide.BUY,
        resource: ExchangeResource.PLASTIC,
        lots: 4,
        price: 10,
        created_at: 1
      })

      const estimate = await new ExchangeEstimateQuery().run({
        player_id: player.id,
        city_id: city.id,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASTIC,
        lots: 2,
        price: 11
      })

      expect(estimate.immediate_fill).toEqual({
        lots: 0,
        water: 0
      })
      expect(estimate.carrier_load).toBe(200)
    })

    it('reports missing carriers and refuses another player\'s city', async () => {
      const player = world.addPlayer()
      const city = world.addCity({
        player,
        stock: { plasma: 10 },
        carriers: 0
      })
      const estimate = await new ExchangeEstimateQuery().run({
        player_id: player.id,
        city_id: city.id,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASMA,
        lots: 1,
        price: 8
      })
      expect(estimate).toMatchObject({
        reserved_carriers: null,
        typical_delivery_duration: null,
        enough_resources: true
      })

      await assert.rejects(() => new ExchangeEstimateQuery().run({
        player_id: world.addPlayer().id,
        city_id: city.id,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASMA,
        lots: 1,
        price: 8
      }), new RegExp(CityError.NOT_OWNER))
    })
  })
})

import assert from 'assert'
import { placeExchangeOrder } from '#app/command/exchange/place'
import { ExchangeWorld } from '#app/test-support/exchange-world'
import { CityError } from '#core/city/error'
import { AppEvent } from '#core/events'
import { ExchangeError } from '#core/exchange/error'
import { ExchangeOrderStatus } from '#core/exchange/value/order-status'
import { ExchangeResource } from '#core/exchange/value/resource'
import { ExchangeSide } from '#core/exchange/value/side'
import { FactionCode } from '#core/faction/constant/code'
import { ReportType } from '#core/communication/value/report-type'
import { TroopCode } from '#core/troop/constant/code'
import { MovementAction } from '#core/troop/constant/movement-action'
import { TroopEntity } from '#core/troop/entity'

describe('placeExchangeOrder (slice 035)', () => {
  let world: ExchangeWorld

  beforeEach(() => {
    world = new ExchangeWorld()
    world.install()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('checks', () => {
    it('requires a trading post in an own city of a human player', async () => {
      const player = world.addPlayer()
      const city = world.addCity({
        player,
        trading_post: 0,
        stock: { plastic: 1000 },
        carriers: 1
      })
      const other = world.addPlayer()
      const other_city = world.addCity({
        player: other,
        stock: { plastic: 1000 },
        carriers: 1
      })
      const system = world.addPlayer({ system_controlled: true })
      const system_city = world.addCity({
        player: system,
        stock: { plastic: 1000 },
        carriers: 1
      })
      const order = {
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASTIC,
        lots: 1,
        price: 5
      }

      await assert.rejects(() => placeExchangeOrder({
        player_id: player.id,
        city_id: city.id,
        ...order
      }), new RegExp(ExchangeError.TRADING_POST_REQUIRED))
      await assert.rejects(() => placeExchangeOrder({
        player_id: player.id,
        city_id: other_city.id,
        ...order
      }), new RegExp(ExchangeError.TRADING_POST_REQUIRED))
      await assert.rejects(() => placeExchangeOrder({
        player_id: system.id,
        city_id: system_city.id,
        ...order
      }), new RegExp(ExchangeError.TRADING_POST_REQUIRED))
    })

    it('limits the open orders of a city to its trading post level', async () => {
      const player = world.addPlayer()
      const city = world.addCity({
        player,
        trading_post: 2,
        stock: { plastic: 1000 },
        carriers: 5
      })
      const sell = {
        player_id: player.id,
        city_id: city.id,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASTIC,
        lots: 1,
        price: 5
      }

      await placeExchangeOrder(sell)
      await placeExchangeOrder(sell)
      await assert.rejects(() => placeExchangeOrder(sell), new RegExp(ExchangeError.ORDER_LIMIT_REACHED))
    })

    it('rejects lots or prices below 1, fractions and unknown sides or resources', async () => {
      const player = world.addPlayer()
      const city = world.addCity({
        player,
        stock: { plastic: 1000 },
        carriers: 1
      })
      for (const invalid of [
        { lots: 0 },
        { price: 0 },
        { lots: 1.5 },
        { price: -3 },
        { side: 'hold' },
        { resource: 'water' },
      ]) {
        await assert.rejects(() => placeExchangeOrder({
          player_id: player.id,
          city_id: city.id,
          side: ExchangeSide.SELL,
          resource: ExchangeResource.PLASTIC,
          lots: 1,
          price: 5,
          ...invalid
        }), new RegExp(ExchangeError.ORDER_INVALID))
      }
    })

    it('needs the stock to reserve', async () => {
      const player = world.addPlayer()
      const city = world.addCity({
        player,
        stock: {
          plastic: 99,
          water: 9
        },
        carriers: 1
      })

      await assert.rejects(() => placeExchangeOrder({
        player_id: player.id,
        city_id: city.id,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASTIC,
        lots: 1,
        price: 5
      }), new RegExp(CityError.NOT_ENOUGH_RESOURCES))
      await assert.rejects(() => placeExchangeOrder({
        player_id: player.id,
        city_id: city.id,
        side: ExchangeSide.BUY,
        resource: ExchangeResource.PLASTIC,
        lots: 2,
        price: 5
      }), new RegExp(CityError.NOT_ENOUGH_RESOURCES))
    })

    it('needs enough available carriers for the payload: exchange:not-enough-carriers', async () => {
      const player = world.addPlayer()
      // 2 plasma lots = 2 plasma × weight 100 = 200 load: a farmer cannot carry, no carrier stack.
      const city = world.addCity({
        player,
        stock: { plasma: 200 },
        carriers: 0
      })
      await assert.rejects(() => placeExchangeOrder({
        player_id: player.id,
        city_id: city.id,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASMA,
        lots: 2,
        price: 50
      }), new RegExp(ExchangeError.NOT_ENOUGH_CARRIERS))
      expect(world.stockOf(city).plasma).toBe(200)
    })
  })

  describe('reservation', () => {
    it('debits the escrow and reserves just enough carriers, largest capacity first', async () => {
      const player = world.addPlayer()
      const city = world.addCity({
        player,
        stock: { plastic: 30000 },
        carriers: 5
      })

      // 250 lots = 25 000 plastic → 3 light transporters (10 000 each).
      const { order_id } = await placeExchangeOrder({
        player_id: player.id,
        city_id: city.id,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASTIC,
        lots: 250,
        price: 2
      })

      expect(world.stockOf(city).plastic).toBe(5000)
      expect(world.reservations.get(order_id)).toEqual([
        {
          troop_code: TroopCode.LIGHT_TRANSPORTER,
          count: 3
        }
      ])
      // The carriers stay on the cell.
      expect(world.stackCount(city)).toBe(5)
    })

    it('reserves the water of a buy at its limit price', async () => {
      const player = world.addPlayer()
      const city = world.addCity({
        player,
        stock: { water: 1000 },
        carriers: 1
      })

      const { order_id } = await placeExchangeOrder({
        player_id: player.id,
        city_id: city.id,
        side: ExchangeSide.BUY,
        resource: ExchangeResource.MUSHROOM,
        lots: 4,
        price: 25
      })

      expect(world.stockOf(city).water).toBe(900)
      expect(world.reservedCount(order_id)).toBe(1)
      expect(world.order(order_id).status).toBe(ExchangeOrderStatus.OPEN)
    })

    it('does not count carriers already reserved by another order of the city', async () => {
      const player = world.addPlayer()
      const city = world.addCity({
        player,
        trading_post: 3,
        stock: { plastic: 20000 },
        carriers: 1
      })
      await placeExchangeOrder({
        player_id: player.id,
        city_id: city.id,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASTIC,
        lots: 1,
        price: 5
      })

      await assert.rejects(() => placeExchangeOrder({
        player_id: player.id,
        city_id: city.id,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASTIC,
        lots: 1,
        price: 5
      }), new RegExp(ExchangeError.NOT_ENOUGH_CARRIERS))
    })
  })

  describe('matching', () => {
    const setup = () => {
      const buyer = world.addPlayer({ name: 'buyer' })
      const buyer_city = world.addCity({
        player: buyer,
        x: 0,
        stock: { water: 10000 },
        carriers: 10
      })
      const seller_a = world.addPlayer({ name: 'seller-a' })
      const city_a = world.addCity({
        player: seller_a,
        x: 5,
        carriers: 5
      })
      const seller_b = world.addPlayer({ name: 'seller-b' })
      const city_b = world.addCity({
        player: seller_b,
        x: 10,
        carriers: 5
      })
      return {
        buyer,
        buyer_city,
        seller_a,
        city_a,
        seller_b,
        city_b
      }
    }

    it('takes the lowest sells first, oldest first at equal price, and executes at the resting price', async () => {
      const {
        buyer, buyer_city, seller_a, city_a, seller_b, city_b
      } = setup()
      const late_cheap = world.addOrder({
        player: seller_a,
        city: city_a,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASTIC,
        lots: 1,
        price: 8,
        created_at: 300
      })
      const expensive = world.addOrder({
        player: seller_b,
        city: city_b,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASTIC,
        lots: 1,
        price: 9,
        created_at: 100
      })
      const early_cheap = world.addOrder({
        player: seller_b,
        city: city_b,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASTIC,
        lots: 1,
        price: 8,
        created_at: 200
      })

      const result = await placeExchangeOrder({
        player_id: buyer.id,
        city_id: buyer_city.id,
        side: ExchangeSide.BUY,
        resource: ExchangeResource.PLASTIC,
        lots: 2,
        price: 10
      })

      expect(result).toMatchObject({
        status: ExchangeOrderStatus.FILLED,
        filled_lots: 2
      })
      expect(world.trades.map(trade => [
        trade.sell_order_id,
        trade.price
      ])).toEqual([
        [
          early_cheap.id,
          8
        ],
        [
          late_cheap.id,
          8
        ],
      ])
      expect(world.order(expensive.id).status).toBe(ExchangeOrderStatus.OPEN)
    })

    it('fills partially across several orders and leaves the rest in the book', async () => {
      const {
        buyer, buyer_city, seller_a, city_a, seller_b, city_b
      } = setup()
      const a = world.addOrder({
        player: seller_a,
        city: city_a,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.MUSHROOM,
        lots: 3,
        price: 4,
        created_at: 1
      })
      const b = world.addOrder({
        player: seller_b,
        city: city_b,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.MUSHROOM,
        lots: 10,
        price: 5,
        created_at: 2
      })

      const result = await placeExchangeOrder({
        player_id: buyer.id,
        city_id: buyer_city.id,
        side: ExchangeSide.BUY,
        resource: ExchangeResource.MUSHROOM,
        lots: 5,
        price: 5
      })

      expect(result).toMatchObject({
        status: ExchangeOrderStatus.FILLED,
        filled_lots: 5
      })
      expect(world.order(a.id)).toMatchObject({
        status: ExchangeOrderStatus.FILLED,
        filled_lots: 3
      })
      expect(world.order(b.id)).toMatchObject({
        status: ExchangeOrderStatus.OPEN,
        filled_lots: 2
      })
      expect(world.trades.map(trade => trade.lots)).toEqual([
        3,
        2
      ])
    })

    it('keeps the unmatched rest of an incoming order open', async () => {
      const {
        buyer, buyer_city, seller_a, city_a
      } = setup()
      world.addOrder({
        player: seller_a,
        city: city_a,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASTIC,
        lots: 1,
        price: 3,
        created_at: 1
      })

      const result = await placeExchangeOrder({
        player_id: buyer.id,
        city_id: buyer_city.id,
        side: ExchangeSide.BUY,
        resource: ExchangeResource.PLASTIC,
        lots: 4,
        price: 3
      })

      expect(result).toMatchObject({
        status: ExchangeOrderStatus.OPEN,
        filled_lots: 1
      })
      // 3 lots × 3 water still escrowed.
      expect(world.stockOf(buyer_city).water).toBe(10000 - 12)
      expect(world.reservedCount(result.order_id)).toBe(1)
    })

    it('never matches the player\'s own orders', async () => {
      const {
        buyer, buyer_city
      } = setup()
      const second_city = world.addCity({
        player: buyer,
        stock: { plastic: 1000 },
        carriers: 1
      })
      const own = world.addOrder({
        player: buyer,
        city: second_city,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASTIC,
        lots: 1,
        price: 1,
        created_at: 1
      })

      const result = await placeExchangeOrder({
        player_id: buyer.id,
        city_id: buyer_city.id,
        side: ExchangeSide.BUY,
        resource: ExchangeResource.PLASTIC,
        lots: 1,
        price: 5
      })

      expect(result.filled_lots).toBe(0)
      expect(world.order(own.id).status).toBe(ExchangeOrderStatus.OPEN)
      expect(world.trades).toEqual([])
    })

    it('never matches orders of another faction', async () => {
      const {
        buyer, buyer_city
      } = setup()
      const foreigner = world.addPlayer({ faction_code: FactionCode.THE_TECHNOLOGICAL_SINGULARITY })
      const foreign_city = world.addCity({
        player: foreigner,
        carriers: 1,
        carrier_code: TroopCode.HAULER
      })
      world.addOrder({
        player: foreigner,
        city: foreign_city,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASTIC,
        lots: 1,
        price: 1,
        created_at: 1,
        carrier_code: TroopCode.HAULER
      })

      const result = await placeExchangeOrder({
        player_id: buyer.id,
        city_id: buyer_city.id,
        side: ExchangeSide.BUY,
        resource: ExchangeResource.PLASTIC,
        lots: 1,
        price: 5
      })

      expect(result.filled_lots).toBe(0)
      expect(world.trades).toEqual([])
    })

    it('releases the price improvement to the buyer', async () => {
      const {
        buyer, buyer_city, seller_a, city_a
      } = setup()
      world.addOrder({
        player: seller_a,
        city: city_a,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASMA,
        lots: 2,
        price: 30,
        created_at: 1
      })

      await placeExchangeOrder({
        player_id: buyer.id,
        city_id: buyer_city.id,
        side: ExchangeSide.BUY,
        resource: ExchangeResource.PLASMA,
        lots: 2,
        price: 50
      })

      // Escrow 100 at the limit, 60 shipped, 40 back.
      expect(world.stockOf(buyer_city).water).toBe(10000 - 60)
      const buyer_report = world.trade_reports.find(entry => entry.report.player_id === buyer.id)
      expect(buyer_report?.metadata.refunded_water).toBe(40)
    })

    it('executes a sell at the higher resting buy price', async () => {
      const {
        buyer, buyer_city, seller_a, city_a
      } = setup()
      world.stocks.set(city_a.cell_id, world.stockOf(city_a).refund({
        resource: {
          plastic: 0,
          mushroom: 500,
          plasma: 0,
          water: 0
        }
      }))
      world.addOrder({
        player: buyer,
        city: buyer_city,
        side: ExchangeSide.BUY,
        resource: ExchangeResource.MUSHROOM,
        lots: 5,
        price: 12,
        created_at: 1
      })

      await placeExchangeOrder({
        player_id: seller_a.id,
        city_id: city_a.id,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.MUSHROOM,
        lots: 5,
        price: 7
      })

      expect(world.trades[0]).toMatchObject({
        lots: 5,
        price: 12
      })
    })
  })

  describe('convoys', () => {
    it('sends the goods and the water as exchange convoys with just enough reserved carriers', async () => {
      const seller = world.addPlayer()
      const seller_city = world.addCity({
        player: seller,
        x: 0,
        carriers: 3
      })
      const buyer = world.addPlayer()
      const buyer_city = world.addCity({
        player: buyer,
        x: 4,
        stock: { water: 1000 },
        carriers: 2
      })
      const resting = world.addOrder({
        player: seller,
        city: seller_city,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASTIC,
        lots: 300,
        price: 1,
        created_at: 1,
        carriers: 3
      })

      await placeExchangeOrder({
        player_id: buyer.id,
        city_id: buyer_city.id,
        side: ExchangeSide.BUY,
        resource: ExchangeResource.PLASTIC,
        lots: 150,
        price: 1
      })

      const convoys = [ ...world.movements.values() ]
      expect(convoys).toHaveLength(2)
      expect(convoys.every(convoy => convoy.action === MovementAction.EXCHANGE)).toBe(true)
      expect(convoys.every(convoy => convoy.exchange_trade_id === world.trades[0].id)).toBe(true)

      const goods = convoys.find(convoy => convoy.player_id === seller.id)
      assert(goods)
      expect(goods.resources.plastic).toBe(15000)
      expect(goods.origin).toEqual(world.cellOf(seller_city).coordinates)
      expect(goods.destination).toEqual(world.cellOf(buyer_city).coordinates)
      // 15 000 plastic → 2 of the 3 reserved light transporters; the third stays reserved for the rest.
      expect(world.movementTroops(goods.id).map(troop => troop.count)).toEqual([ 2 ])
      expect(world.stackCount(seller_city)).toBe(1)
      expect(world.reservedCount(resting.id)).toBe(1)

      const payment = convoys.find(convoy => convoy.player_id === buyer.id)
      assert(payment)
      expect(payment.resources.water).toBe(150)
      expect(world.movementTroops(payment.id).map(troop => troop.count)).toEqual([ 1 ])
      expect(world.stackCount(buyer_city)).toBe(1)
      expect(world.scheduled.map(job => job.movement_id).sort()).toEqual([
        goods.id,
        payment.id
      ].sort())
    })

    it('releases the remaining reserved carriers when an order is filled', async () => {
      const seller = world.addPlayer()
      const seller_city = world.addCity({
        player: seller,
        stock: { plastic: 100 },
        carriers: 4
      })
      const buyer = world.addPlayer()
      const buyer_city = world.addCity({
        player: buyer,
        stock: { water: 100 },
        carriers: 1
      })
      const resting = world.addOrder({
        player: buyer,
        city: buyer_city,
        side: ExchangeSide.BUY,
        resource: ExchangeResource.PLASTIC,
        lots: 1,
        price: 10,
        created_at: 1,
        carriers: 1
      })

      const { order_id } = await placeExchangeOrder({
        player_id: seller.id,
        city_id: seller_city.id,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASTIC,
        lots: 1,
        price: 10
      })

      expect(world.reservedCount(order_id)).toBe(0)
      expect(world.reservedCount(resting.id)).toBe(0)
    })

    it('tops the reservation up with free carriers after a partial fill used it', async () => {
      const buyer = world.addPlayer()
      const buyer_city = world.addCity({
        player: buyer,
        stock: { water: 10000 },
        carriers: 10
      })
      const seller = world.addPlayer()
      const seller_city = world.addCity({
        player: seller,
        carriers: 1
      })
      world.addOrder({
        player: seller,
        city: seller_city,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASTIC,
        lots: 1,
        price: 3,
        created_at: 1
      })

      // 4 lots × 3 water: 1 carrier reserved; the first fill's payment takes it, a free one replaces it.
      const result = await placeExchangeOrder({
        player_id: buyer.id,
        city_id: buyer_city.id,
        side: ExchangeSide.BUY,
        resource: ExchangeResource.PLASTIC,
        lots: 4,
        price: 3
      })

      expect(world.reservedCount(result.order_id)).toBe(1)
      expect(world.stackCount(buyer_city)).toBe(9)
    })

    it('sends a later fill with free carriers when the reservation could not be topped up', async () => {
      const seller = world.addPlayer()
      const seller_city = world.addCity({
        player: seller,
        carriers: 1
      })
      // One carrier for 2 lots of plasma (200 load); each 1-lot fill needs a carrier of its own.
      const resting = world.addOrder({
        player: seller,
        city: seller_city,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASMA,
        lots: 2,
        price: 5,
        created_at: 1,
        carriers: 1
      })
      const buyOne = async () => {
        const buyer = world.addPlayer()
        const city = world.addCity({
          player: buyer,
          stock: { water: 100 },
          carriers: 1
        })
        return placeExchangeOrder({
          player_id: buyer.id,
          city_id: city.id,
          side: ExchangeSide.BUY,
          resource: ExchangeResource.PLASMA,
          lots: 1,
          price: 5
        })
      }

      await buyOne()
      expect(world.reservedCount(resting.id)).toBe(0)
      expect(world.stackCount(seller_city)).toBe(0)

      // The carrier comes home: it is free, not reserved.
      world.troops = world.troops.map(troop => troop.cell_id === seller_city.cell_id ? TroopEntity.create({
        ...troop,
        count: 1
      }) : troop)
      await buyOne()

      expect(world.order(resting.id).status).toBe(ExchangeOrderStatus.FILLED)
      expect(world.stackCount(seller_city)).toBe(0)
    })

    it('skips a resting order whose city cannot field the carriers', async () => {
      const seller = world.addPlayer()
      const stranded_city = world.addCity({
        player: seller,
        carriers: 0
      })
      const other = world.addPlayer()
      const other_city = world.addCity({
        player: other,
        carriers: 1
      })
      const buyer = world.addPlayer()
      const buyer_city = world.addCity({
        player: buyer,
        stock: { water: 1000 },
        carriers: 1
      })
      // Its carriers died in a battle (slice 024): the order no longer holds any.
      const stranded = world.addOrder({
        player: seller,
        city: stranded_city,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASTIC,
        lots: 1,
        price: 1,
        created_at: 1,
        carriers: 1
      })
      const next = world.addOrder({
        player: other,
        city: other_city,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASTIC,
        lots: 1,
        price: 2,
        created_at: 2,
        carriers: 1
      })

      await placeExchangeOrder({
        player_id: buyer.id,
        city_id: buyer_city.id,
        side: ExchangeSide.BUY,
        resource: ExchangeResource.PLASTIC,
        lots: 1,
        price: 5
      })

      expect(world.order(stranded.id).status).toBe(ExchangeOrderStatus.OPEN)
      expect(world.order(next.id).status).toBe(ExchangeOrderStatus.FILLED)
    })
  })

  describe('reports and events', () => {
    it('writes a trade report to both parties and emits exchange:filled and exchange:book-updated', async () => {
      const seller = world.addPlayer()
      const seller_city = world.addCity({
        player: seller,
        x: 0,
        carriers: 1
      })
      const buyer = world.addPlayer()
      const buyer_city = world.addCity({
        player: buyer,
        x: 2,
        stock: { water: 100 },
        carriers: 1
      })
      const resting = world.addOrder({
        player: seller,
        city: seller_city,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASTIC,
        lots: 2,
        price: 7,
        created_at: 1
      })

      const { order_id } = await placeExchangeOrder({
        player_id: buyer.id,
        city_id: buyer_city.id,
        side: ExchangeSide.BUY,
        resource: ExchangeResource.PLASTIC,
        lots: 2,
        price: 7
      })

      expect(world.trade_reports).toHaveLength(2)
      const seller_report = world.trade_reports.find(entry => entry.report.player_id === seller.id)
      assert(seller_report)
      expect(seller_report.report.type).toBe(ReportType.TRADE)
      expect(seller_report.counterparty_player_id).toBe(buyer.id)
      expect(seller_report.metadata).toMatchObject({
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASTIC,
        lots: 2,
        price: 7,
        city: { id: seller_city.id },
        counterparty_city: { id: buyer_city.id },
      })
      expect(seller_report.metadata.incoming_arrive_at).toBeGreaterThan(seller_report.report.recorded_at)
      expect(seller_report.report.resources.water).toBe(14)

      expect(world.emit).toHaveBeenCalledWith(AppEvent.ExchangeFilled, {
        player_id: seller.id,
        order_id: resting.id,
        lots: 2,
        price: 7
      })
      expect(world.emit).toHaveBeenCalledWith(AppEvent.ExchangeFilled, {
        player_id: buyer.id,
        order_id,
        lots: 2,
        price: 7
      })
      expect(world.emit).toHaveBeenCalledWith(AppEvent.ExchangeBookUpdated, {
        faction_code: FactionCode.THE_CONFEDERATION,
        resource: ExchangeResource.PLASTIC
      })
    })
  })

  describe('market lock', () => {
    it('runs concurrent orders of one market one at a time so a resting order is filled once', async () => {
      const seller = world.addPlayer()
      const seller_city = world.addCity({
        player: seller,
        carriers: 1
      })
      world.addOrder({
        player: seller,
        city: seller_city,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASTIC,
        lots: 1,
        price: 5,
        created_at: 1
      })
      const buyers = [
        0,
        1
      ].map(() => {
        const buyer = world.addPlayer()
        return {
          buyer,
          city: world.addCity({
            player: buyer,
            stock: { water: 100 },
            carriers: 1
          })
        }
      })

      // A slow book read widens the race window: without the lock both orders would see the resting sell.
      const exchange = world.repository().exchange
      const list = exchange.listMatchableForUpdate
      const repository = world.repository()
      repository.exchange.listMatchableForUpdate = async (query) => {
        const rows = await list(query)
        await new Promise(resolve => setTimeout(resolve, 5))
        return rows
      }
      const { Factory } = await import('#adapter/factory')
      vi.mocked(Factory.getRepository).mockReturnValue(repository)

      const results = await Promise.all(buyers.map(({
        buyer, city
      }) => placeExchangeOrder({
        player_id: buyer.id,
        city_id: city.id,
        side: ExchangeSide.BUY,
        resource: ExchangeResource.PLASTIC,
        lots: 1,
        price: 5
      })))

      expect(results.map(result => result.filled_lots).sort()).toEqual([
        0,
        1
      ])
      expect(world.trades).toHaveLength(1)
    })
  })
})

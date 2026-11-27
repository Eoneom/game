import assert from 'assert'
import { Factory } from '#adapter/factory'
import { ExchangeWorld } from '#app/test-support/exchange-world'
import { ExchangeBookQuery } from '#query/exchange/book'
import { ExchangeEstimateQuery } from '#query/exchange/estimate'
import { ExchangeMineQuery } from '#query/exchange/mine'
import { ExchangeTradesQuery } from '#query/exchange/trades'
import { CityError } from '#core/city/error'
import { EXCHANGE_BOOK_DEPTH } from '#core/exchange/constant/limits'
import { ExchangeError } from '#core/exchange/error'
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
            lots: 4
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
            lots: 4
          }
        ],
        asks: []
      })
      expect(getBook).toHaveBeenCalledWith({
        faction_code: FactionCode.THE_ASH_LITURGY,
        resource: ExchangeResource.PLASMA,
        depth: EXCHANGE_BOOK_DEPTH
      })
      expect(listTrades).toHaveBeenCalledWith({
        faction_code: FactionCode.THE_ASH_LITURGY,
        resource: ExchangeResource.PLASMA,
        limit: 50
      })
    })

    it('rejects an unknown pair', async () => {
      const player = world.addPlayer()
      await assert.rejects(() => new ExchangeBookQuery().run({
        player_id: player.id,
        resource: 'water'
      }), new RegExp(ExchangeError.RESOURCE_INVALID))
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
      // Median of 4, 10 and 30 cells.
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
      }))
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

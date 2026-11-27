import assert from 'assert'
import { cancelExchangeOrder } from '#app/command/exchange/cancel'
import { expireExchangeOrders } from '#app/command/exchange/expire'
import { placeExchangeOrder } from '#app/command/exchange/place'
import { cancelCityExchangeOrders } from '#app/command/exchange/shared'
import { EXCHANGE_ORDER_EXPIRE_INTERVAL_MS } from '#app/scheduling/intervals'
import { ExchangeWorld } from '#app/test-support/exchange-world'
import { CityEntity } from '#core/city/entity'
import { AppEvent } from '#core/events'
import { EXCHANGE_ORDER_LIFETIME_MS } from '#core/exchange/constant/limits'
import { ExchangeOrderEntity } from '#core/exchange/entity'
import { ExchangeError } from '#core/exchange/error'
import { ExchangeOrderStatus } from '#core/exchange/value/order-status'
import { ExchangeResource } from '#core/exchange/value/resource'
import { ExchangeSide } from '#core/exchange/value/side'

describe('exchange order lifecycle (slice 035)', () => {
  let world: ExchangeWorld

  beforeEach(() => {
    world = new ExchangeWorld()
    world.install()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  const placeSell = async () => {
    const player = world.addPlayer()
    const city = world.addCity({
      player,
      stock: { plastic: 1000 },
      carriers: 2
    })
    const { order_id } = await placeExchangeOrder({
      player_id: player.id,
      city_id: city.id,
      side: ExchangeSide.SELL,
      resource: ExchangeResource.PLASTIC,
      lots: 5,
      price: 3
    })
    return {
      player,
      city,
      order_id
    }
  }

  describe('cancel', () => {
    it('returns the unfilled escrow to the city stock and releases the carriers', async () => {
      const {
        player, city, order_id
      } = await placeSell()
      expect(world.stockOf(city).plastic).toBe(500)
      expect(world.reservedCount(order_id)).toBe(1)

      await cancelExchangeOrder({
        player_id: player.id,
        order_id
      })

      expect(world.stockOf(city).plastic).toBe(1000)
      expect(world.reservedCount(order_id)).toBe(0)
      expect(world.order(order_id).status).toBe(ExchangeOrderStatus.CANCELLED)
      expect(world.emit).toHaveBeenCalledWith(AppEvent.ExchangeBookUpdated, expect.objectContaining({ resource: ExchangeResource.PLASTIC }))
    })

    it('only returns the unfilled lots of a partially filled buy', async () => {
      const seller = world.addPlayer()
      const seller_city = world.addCity({
        player: seller,
        carriers: 1
      })
      world.addOrder({
        player: seller,
        city: seller_city,
        side: ExchangeSide.SELL,
        resource: ExchangeResource.MUSHROOM,
        lots: 2,
        price: 10,
        created_at: 1
      })
      const buyer = world.addPlayer()
      const buyer_city = world.addCity({
        player: buyer,
        stock: { water: 100 },
        carriers: 3
      })
      const { order_id } = await placeExchangeOrder({
        player_id: buyer.id,
        city_id: buyer_city.id,
        side: ExchangeSide.BUY,
        resource: ExchangeResource.MUSHROOM,
        lots: 5,
        price: 10
      })
      expect(world.stockOf(buyer_city).water).toBe(50)

      await cancelExchangeOrder({
        player_id: buyer.id,
        order_id
      })

      // 2 lots paid (20 water on the way), 3 lots × 10 back.
      expect(world.stockOf(buyer_city).water).toBe(80)
    })

    it('hides other players\' orders and refuses closed ones', async () => {
      const {
        player, order_id
      } = await placeSell()
      const intruder = world.addPlayer()

      await assert.rejects(() => cancelExchangeOrder({
        player_id: intruder.id,
        order_id
      }), new RegExp(ExchangeError.ORDER_NOT_FOUND))

      await cancelExchangeOrder({
        player_id: player.id,
        order_id
      })
      await assert.rejects(() => cancelExchangeOrder({
        player_id: player.id,
        order_id
      }), new RegExp(ExchangeError.ORDER_NOT_OPEN))
    })
  })

  describe('expiry', () => {
    it('expires open orders after 7 days with the same release, then reschedules itself', async () => {
      const {
        city, order_id
      } = await placeSell()
      const { order_id: fresh_id } = await (async () => {
        const player = world.addPlayer()
        const other_city = world.addCity({
          player,
          stock: { plastic: 100 },
          carriers: 1
        })
        return placeExchangeOrder({
          player_id: player.id,
          city_id: other_city.id,
          side: ExchangeSide.SELL,
          resource: ExchangeResource.PLASTIC,
          lots: 1,
          price: 2
        })
      })()
      const placed_at = world.order(order_id).created_at
      world.orders.set(order_id, ExchangeOrderEntity.create({
        ...world.order(order_id),
        created_at: placed_at - EXCHANGE_ORDER_LIFETIME_MS - 1
      }))

      vi.useFakeTimers({ now: placed_at + 1 })
      await expireExchangeOrders()

      expect(world.order(order_id).status).toBe(ExchangeOrderStatus.EXPIRED)
      expect(world.stockOf(city).plastic).toBe(1000)
      expect(world.reservedCount(order_id)).toBe(0)
      expect(world.order(fresh_id).status).toBe(ExchangeOrderStatus.OPEN)
      expect(world.scheduleExchangeOrderExpire).toHaveBeenCalledWith({ execute_at: placed_at + 1 + EXCHANGE_ORDER_EXPIRE_INTERVAL_MS })
    })
  })

  describe('city capture', () => {
    it('cancels the captured city\'s open orders and gives their escrow to the city stock', async () => {
      const {
        city, order_id
      } = await placeSell()
      const conqueror = world.addPlayer()
      world.cities.set(city.id, CityEntity.create({
        ...city,
        player_id: conqueror.id
      }))

      const markets = await cancelCityExchangeOrders({
        city_id: city.id,
        closed_at: 5
      })

      expect(world.order(order_id)).toMatchObject({
        status: ExchangeOrderStatus.CANCELLED,
        closed_at: 5
      })
      expect(world.stockOf(city).plastic).toBe(1000)
      expect(world.reservedCount(order_id)).toBe(0)
      expect(markets).toEqual([ expect.objectContaining({ resource: ExchangeResource.PLASTIC }) ])
    })
  })
})

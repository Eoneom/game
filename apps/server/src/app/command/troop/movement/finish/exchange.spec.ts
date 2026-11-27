import assert from 'assert'
import { placeExchangeOrder } from '#app/command/exchange/place'
import { finishExchangeMovement } from '#app/command/troop/movement/finish/exchange'
import { AppService } from '#app/service'
import { ExchangeWorld } from '#app/test-support/exchange-world'
import { CityEntity } from '#core/city/entity'
import { ExchangeResource } from '#core/exchange/value/resource'
import { ExchangeSide } from '#core/exchange/value/side'
import { MovementAction } from '#core/troop/constant/movement-action'
import { MovementKind } from '#core/troop/constant/movement-kind'
import { MovementEntity } from '#core/troop/movement/entity'

describe('finishExchangeMovement (slice 035)', () => {
  let world: ExchangeWorld

  beforeEach(() => {
    world = new ExchangeWorld()
    world.install()
    vi.spyOn(AppService, 'getTacticalPropulsionLevel').mockResolvedValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /** A 2-lot plastic trade at 5 water: the seller's goods convoy and the buyer's water convoy. */
  const trade = async () => {
    const seller = world.addPlayer()
    const seller_city = world.addCity({
      player: seller,
      x: 0,
      carriers: 1
    })
    const buyer = world.addPlayer()
    const buyer_city = world.addCity({
      player: buyer,
      x: 6,
      stock: {
        water: 100,
        plastic: 900
      },
      carriers: 1
    })
    world.addOrder({
      player: seller,
      city: seller_city,
      side: ExchangeSide.SELL,
      resource: ExchangeResource.PLASTIC,
      lots: 2,
      price: 5,
      created_at: 1
    })
    await placeExchangeOrder({
      player_id: buyer.id,
      city_id: buyer_city.id,
      side: ExchangeSide.BUY,
      resource: ExchangeResource.PLASTIC,
      lots: 2,
      price: 5
    })
    const convoys = [ ...world.movements.values() ]
    const goods = convoys.find(convoy => convoy.player_id === seller.id)
    const payment = convoys.find(convoy => convoy.player_id === buyer.id)
    assert(goods && payment)
    return {
      seller,
      seller_city,
      buyer,
      buyer_city,
      goods,
      payment
    }
  }

  it('deposits the cargo even above warehouse capacity, then the carriers return home without counting toward the cap', async () => {
    const {
      seller, buyer_city, goods
    } = await trade()

    const result = await finishExchangeMovement({
      player_id: seller.id,
      movement_id: goods.id,
      arrived_at: 1000
    })

    // 900 + 200: no warehouse check.
    expect(world.stockOf(buyer_city).plastic).toBe(1100)
    assert(result.kind === 'returning')
    expect(result.base_movement).toMatchObject({
      action: MovementAction.BASE,
      origin: goods.destination,
      destination: goods.origin,
      exchange_trade_id: goods.exchange_trade_id,
    })
    // The carriers' trip home stays under « Convois » (slice 045).
    expect(result.base_movement.getKind()).toBe(MovementKind.CONVOY)
    // The carriers leave when the convoy arrives (slice 044 `departure_at`).
    expect(result.base_movement.started_at).toBe(1000)
    expect(result.base_movement.hasResources()).toBe(false)
    expect(world.movements.has(goods.id)).toBe(false)
    expect(world.movementTroops(result.base_movement.id).map(troop => troop.count)).toEqual([ 1 ])
  })

  it('delivers the water to the seller', async () => {
    const {
      buyer, seller_city, payment
    } = await trade()

    await finishExchangeMovement({
      player_id: buyer.id,
      movement_id: payment.id,
      arrived_at: 1000
    })

    expect(world.stockOf(seller_city).water).toBe(10)
  })

  it('goes on to the recipient\'s closest city when the destination changed hands', async () => {
    const {
      seller, buyer, buyer_city, goods
    } = await trade()
    const far = world.addCity({
      player: buyer,
      x: 40
    })
    const near = world.addCity({
      player: buyer,
      x: 8
    })
    world.cities.set(buyer_city.id, CityEntity.create({
      ...buyer_city,
      player_id: world.addPlayer().id
    }))

    const result = await finishExchangeMovement({
      player_id: seller.id,
      movement_id: goods.id,
      arrived_at: 1000
    })

    assert(result.kind === 'redirected')
    expect(result.movement).toMatchObject({
      action: MovementAction.EXCHANGE,
      origin: goods.destination,
      destination: world.cellOf(near).coordinates,
      exchange_trade_id: goods.exchange_trade_id,
    })
    expect(result.movement.resources.plastic).toBe(200)
    expect(world.stockOf(buyer_city).plastic).toBe(900)
    expect(world.stockOf(far).plastic).toBe(0)

    // On arrival there, the carriers go back to their order city, not to the lost one.
    const delivered = await finishExchangeMovement({
      player_id: seller.id,
      movement_id: result.movement.id,
      arrived_at: 2000
    })
    expect(world.stockOf(near).plastic).toBe(200)
    assert(delivered.kind === 'returning')
    expect(delivered.base_movement.destination).toEqual(goods.origin)
  })

  it('turns back with the cargo when the recipient has no city left', async () => {
    const {
      seller, buyer_city, goods
    } = await trade()
    world.cities.set(buyer_city.id, CityEntity.create({
      ...buyer_city,
      player_id: world.addPlayer().id
    }))

    const result = await finishExchangeMovement({
      player_id: seller.id,
      movement_id: goods.id,
      arrived_at: 1000
    })

    assert(result.kind === 'returning')
    expect(result.base_movement.resources.plastic).toBe(200)
    expect(result.base_movement.destination).toEqual(goods.origin)
  })

  it('only finishes exchange movements', async () => {
    const { seller } = await trade()
    const movement = MovementEntity.create({
      id: 'base',
      player_id: seller.id,
      action: MovementAction.BASE,
      origin: {
        x: 0,
        y: 0
      },
      destination: {
        x: 1,
        y: 0
      },
    })
    world.movements.set(movement.id, movement)

    await assert.rejects(() => finishExchangeMovement({
      player_id: seller.id,
      movement_id: movement.id,
      arrived_at: 1
    }))
  })
})

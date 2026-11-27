import { ExchangeOrderEntity } from '#core/exchange/entity'
import { ExchangeError } from '#core/exchange/error'
import { ExchangeService } from '#core/exchange/service'
import { ExchangeOrderStatus } from '#core/exchange/value/order-status'
import { ExchangeResource } from '#core/exchange/value/resource'
import { ExchangeSide } from '#core/exchange/value/side'
import { FactionCode } from '#core/faction/constant/code'
import { TroopCode } from '#core/troop/constant/code'

const water = (amount: number) => ({
  plastic: 0,
  mushroom: 0,
  plasma: 0,
  water: amount
})

describe('ExchangeService (slice 035)', () => {
  describe('assertOrderInput', () => {
    it('accepts integer lots and prices ≥ 1 on a known side and resource', () => {
      expect(ExchangeService.assertOrderInput({
        side: 'buy',
        resource: 'plasma',
        lots: 3,
        price: 1
      })).toEqual({
        side: ExchangeSide.BUY,
        resource: ExchangeResource.PLASMA,
        lots: 3,
        price: 1
      })
    })

    it.each([
      { lots: 0 },
      { price: 0 },
      { lots: 2.5 },
      { price: '5' },
      { side: 'short' },
      { resource: 'water' },
      { lots: 2 ** 31 },
    ])('rejects %o', (invalid) => {
      expect(() => ExchangeService.assertOrderInput({
        side: 'sell',
        resource: 'plastic',
        lots: 1,
        price: 1,
        ...invalid
      })).toThrow(ExchangeError.ORDER_INVALID)
    })
  })

  describe('escrow', () => {
    it('holds the goods of a sell (100 plastic or mushroom, 1 plasma per lot) and the water of a buy at its limit', () => {
      expect(ExchangeService.escrow({
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASTIC,
        lots: 3,
        price: 9
      }).plastic).toBe(300)
      expect(ExchangeService.escrow({
        side: ExchangeSide.SELL,
        resource: ExchangeResource.PLASMA,
        lots: 3,
        price: 9
      }).plasma).toBe(3)
      expect(ExchangeService.escrow({
        side: ExchangeSide.BUY,
        resource: ExchangeResource.MUSHROOM,
        lots: 3,
        price: 9
      })).toEqual(water(27))
    })

    it('keeps only the unfilled lots of an open order', () => {
      const order = ExchangeOrderEntity.place({
        player_id: 'p',
        faction_code: FactionCode.THE_CONFEDERATION,
        city_id: 'c',
        side: ExchangeSide.BUY,
        resource: ExchangeResource.PLASTIC,
        lots: 5,
        price: 4,
        created_at: 0,
      }).fill({
        lots: 2,
        filled_at: 1
      })
      expect(ExchangeService.remainingEscrow(order)).toEqual(water(12))
    })

    it('releases the price improvement to the buyer', () => {
      expect(ExchangeService.priceImprovement({
        lots: 3,
        limit_price: 10,
        execution_price: 7
      })).toBe(9)
      expect(ExchangeService.priceImprovement({
        lots: 3,
        limit_price: 7,
        execution_price: 7
      })).toBe(0)
    })
  })

  describe('carriers', () => {
    it('allocates just enough carriers, largest transport capacity first', () => {
      // 25 000 plastic → 3 light transporters (10 000 each); explorers are scouts, not carriers.
      expect(ExchangeService.allocateCarriers({
        stacks: [
          {
            code: TroopCode.EXPLORER,
            count: 50
          },
          {
            code: TroopCode.LIGHT_TRANSPORTER,
            count: 5
          },
        ],
        resources: {
          plastic: 25000,
          mushroom: 0,
          plasma: 0,
          water: 0
        },
      })).toEqual([
        {
          code: TroopCode.LIGHT_TRANSPORTER,
          count: 3
        }
      ])
    })

    it('weighs water (2) and plasma (100) and returns null when the stacks cannot carry the load', () => {
      expect(ExchangeService.allocateCarriers({
        stacks: [
          {
            code: TroopCode.LIGHT_TRANSPORTER,
            count: 1
          }
        ],
        resources: water(5000),
      })).toEqual([
        {
          code: TroopCode.LIGHT_TRANSPORTER,
          count: 1
        }
      ])
      expect(ExchangeService.allocateCarriers({
        stacks: [
          {
            code: TroopCode.LIGHT_TRANSPORTER,
            count: 1
          }
        ],
        resources: water(5001),
      })).toBeNull()
    })

    it('computes available = stack count − reserved, never negative', () => {
      expect(ExchangeService.availableTroops({
        troops: [
          {
            code: TroopCode.LIGHT_TRANSPORTER,
            count: 4
          },
          {
            code: TroopCode.FARMER,
            count: 7
          },
        ],
        reservations: [
          {
            troop_code: TroopCode.LIGHT_TRANSPORTER,
            count: 3
          },
          {
            troop_code: TroopCode.LIGHT_TRANSPORTER,
            count: 2
          },
        ],
      })).toEqual([
        {
          code: TroopCode.LIGHT_TRANSPORTER,
          count: 0
        },
        {
          code: TroopCode.FARMER,
          count: 7
        },
      ])
    })

    it('takes convoy carriers from the reservation first, then from free carriers', () => {
      const reservations = [
        {
          troop_code: TroopCode.LIGHT_TRANSPORTER,
          count: 1
        }
      ]
      const free = [
        {
          code: TroopCode.LIGHT_TRANSPORTER,
          count: 2
        }
      ]
      expect(ExchangeService.convoyCarriers({
        reservations,
        free,
        resources: water(15000)
      })).toEqual({
        from_reservation: [
          {
            code: TroopCode.LIGHT_TRANSPORTER,
            count: 1
          }
        ],
        from_free: [
          {
            code: TroopCode.LIGHT_TRANSPORTER,
            count: 2
          }
        ],
      })
      expect(ExchangeService.convoyCarriers({
        reservations,
        free,
        resources: water(15001)
      })).toBeNull()
    })

    it('tops a reservation up with free carriers when it no longer covers the rest', () => {
      expect(ExchangeService.topUpReservations({
        reservations: [],
        free: [
          {
            code: TroopCode.LIGHT_TRANSPORTER,
            count: 4
          }
        ],
        resources: water(9000),
      })).toEqual([
        {
          troop_code: TroopCode.LIGHT_TRANSPORTER,
          count: 2
        }
      ])
      const covered = [
        {
          troop_code: TroopCode.LIGHT_TRANSPORTER,
          count: 1
        }
      ]
      expect(ExchangeService.topUpReservations({
        reservations: covered,
        free: [],
        resources: water(10)
      })).toBe(covered)
    })
  })

  describe('matching', () => {
    const resting = (id: string, price: number, created_at: number) => ({
      id,
      price,
      created_at,
      remaining_lots: 1
    })

    it('sorts sells for a buyer by lowest price, then oldest', () => {
      expect(ExchangeService.sortByPriority({
        side: ExchangeSide.BUY,
        resting: [
          resting('c', 9, 1),
          resting('b', 8, 5),
          resting('a', 8, 2)
        ],
      }).map(order => order.id)).toEqual([
        'a',
        'b',
        'c'
      ])
    })

    it('sorts buys for a seller by highest price, then oldest', () => {
      expect(ExchangeService.sortByPriority({
        side: ExchangeSide.SELL,
        resting: [
          resting('c', 7, 1),
          resting('b', 9, 5),
          resting('a', 9, 2)
        ],
      }).map(order => order.id)).toEqual([
        'a',
        'b',
        'c'
      ])
    })

    it('fills min(remaining, resting) lots at the resting price when the prices cross', () => {
      expect(ExchangeService.fillTerms({
        side: ExchangeSide.BUY,
        limit_price: 10,
        remaining_lots: 5,
        resting: {
          id: 's',
          price: 8,
          created_at: 0,
          remaining_lots: 3
        },
      })).toEqual({
        lots: 3,
        price: 8
      })
      expect(ExchangeService.fillTerms({
        side: ExchangeSide.SELL,
        limit_price: 6,
        remaining_lots: 2,
        resting: {
          id: 'b',
          price: 9,
          created_at: 0,
          remaining_lots: 3
        },
      })).toEqual({
        lots: 2,
        price: 9
      })
      expect(ExchangeService.fillTerms({
        side: ExchangeSide.BUY,
        limit_price: 7,
        remaining_lots: 2,
        resting: {
          id: 's',
          price: 8,
          created_at: 0,
          remaining_lots: 3
        },
      })).toBeNull()
    })
  })

  describe('ExchangeOrderEntity', () => {
    const order = () => ExchangeOrderEntity.place({
      player_id: 'p',
      faction_code: FactionCode.THE_CONFEDERATION,
      city_id: 'c',
      side: ExchangeSide.SELL,
      resource: ExchangeResource.PLASTIC,
      lots: 3,
      price: 4,
      created_at: 1000,
    })

    it('closes as filled with its last lot', () => {
      const partial = order().fill({
        lots: 2,
        filled_at: 2000
      })
      expect(partial).toMatchObject({
        status: ExchangeOrderStatus.OPEN,
        filled_lots: 2,
        remaining_lots: 1,
        closed_at: null
      })
      expect(partial.fill({
        lots: 1,
        filled_at: 3000
      })).toMatchObject({
        status: ExchangeOrderStatus.FILLED,
        closed_at: 3000
      })
    })

    it('expires 7 days after placement', () => {
      expect(order().expires_at).toBe(1000 + 7 * 24 * 60 * 60 * 1000)
    })
  })
})

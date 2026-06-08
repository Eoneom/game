import {
  STARTING_MUSHROOM,
  STARTING_PLASTIC
} from '#core/city/constant'
import { CityError } from '#core/city/error'
import { ResourcesService } from '#core/resources/service'
import assert from 'assert'

describe('ResourcesService', () => {
  describe('randomResourceStockState', () => {
    it('respects inclusive bounds with fixed RNG', () => {
      const r = ResourcesService.randomResourceStockState({
        gather_at: 100,
        random: () => 0
      })
      assert.strictEqual(r.plastic, 0)
      assert.strictEqual(r.mushroom, 0)

      const r2 = ResourcesService.randomResourceStockState({
        gather_at: 100,
        random: () => 0.999999
      })
      assert.strictEqual(r2.plastic, STARTING_PLASTIC)
      assert.strictEqual(r2.mushroom, STARTING_MUSHROOM)
    })
  })

  describe('randomIntInclusive', () => {
    it('returns max when random approaches 1', () => {
      assert.strictEqual(ResourcesService.randomIntInclusive({
        max: 5,
        random: () => 0.999 
      }), 5)
    })
  })

  const base_state = {
    plastic: STARTING_PLASTIC,
    mushroom: STARTING_MUSHROOM,
    plasma: 0,
    last_plastic_gather: 1_000,
    last_mushroom_gather: 1_000,
    last_plasma_gather: 1_000
  }

  describe('purchaseResourceStock', () => {
    it('throws when not enough', () => {
      assert.throws(() => ResourcesService.purchaseResourceStock({
        state: base_state,
        resource: {
          plastic: 999_999,
          mushroom: 0,
          plasma: 0
        }
      }), new RegExp(CityError.NOT_ENOUGH_RESOURCES))
    })

    it('deducts', () => {
      const next = ResourcesService.purchaseResourceStock({
        state: base_state,
        resource: {
          plastic: 10,
          mushroom: 20,
          plasma: 0
        }
      })
      assert.strictEqual(next.plastic, STARTING_PLASTIC - 10)
      assert.strictEqual(next.mushroom, STARTING_MUSHROOM - 20)
    })
  })

  describe('refundResourceStock', () => {
    it('adds resources', () => {
      const next = ResourcesService.refundResourceStock({
        state: base_state,
        resource: {
          plastic: 5,
          mushroom: 7,
          plasma: 3
        }
      })
      assert.strictEqual(next.plastic, STARTING_PLASTIC + 5)
      assert.strictEqual(next.mushroom, STARTING_MUSHROOM + 7)
      assert.strictEqual(next.plasma, 3)
    })
  })

  describe('gatherResourceStock', () => {
    it('no update when no earnings and zero rates', () => {
      const {
        next, updated 
      } = ResourcesService.gatherResourceStock({
        state: base_state,
        gather_at_time: base_state.last_plastic_gather + 1000,
        earnings_per_second: {
          plastic: 0,
          mushroom: 0,
          plasma: 0
        },
        warehouses_capacity: {
          plastic: 100_000,
          mushroom: 100_000
        }
      })
      assert.strictEqual(updated, false)
      assert.strictEqual(next.plastic, base_state.plastic)
    })

    it('gathers when enough time passed', () => {
      const plastic_eps = 1000
      const mushroom_eps = 500
      const seconds = 3
      const {
        next, updated 
      } = ResourcesService.gatherResourceStock({
        state: base_state,
        gather_at_time: base_state.last_plastic_gather + seconds * 1000,
        earnings_per_second: {
          plastic: plastic_eps,
          mushroom: mushroom_eps,
          plasma: 0
        },
        warehouses_capacity: {
          plastic: 1_000_000,
          mushroom: 1_000_000
        }
      })
      assert.strictEqual(updated, true)
      assert.strictEqual(next.plastic, base_state.plastic + seconds * plastic_eps)
      assert.strictEqual(next.mushroom, base_state.mushroom + seconds * mushroom_eps)
    })

    it('gathers plasma without warehouse cap', () => {
      const state = {
        ...base_state,
        plasma: 10_000
      }
      const {
        next, updated
      } = ResourcesService.gatherResourceStock({
        state,
        gather_at_time: state.last_plasma_gather + 5_000,
        earnings_per_second: {
          plastic: 0,
          mushroom: 0,
          plasma: 100
        },
        warehouses_capacity: {
          plastic: 1,
          mushroom: 1
        }
      })
      assert.strictEqual(updated, true)
      assert.strictEqual(next.plasma, 10_000 + 500)
      assert.strictEqual(next.last_plasma_gather, state.last_plasma_gather + 5_000)
    })
  })

  describe('computeWarehouseFullInSeconds', () => {
    it('returns 0 when no space remains', () => {
      expect(ResourcesService.computeWarehouseFullInSeconds({
        space_remaining: 0,
        earnings_per_second: 5,
      })).toBe(0)
    })

    it('returns 0 when space remains but earnings are zero', () => {
      expect(ResourcesService.computeWarehouseFullInSeconds({
        space_remaining: 100,
        earnings_per_second: 0,
      })).toBe(0)
    })

    it('returns 0 when space remains but earnings are negative', () => {
      expect(ResourcesService.computeWarehouseFullInSeconds({
        space_remaining: 100,
        earnings_per_second: -1,
      })).toBe(0)
    })

    it('returns seconds until full when space and earnings are positive', () => {
      expect(ResourcesService.computeWarehouseFullInSeconds({
        space_remaining: 100,
        earnings_per_second: 2,
      })).toBe(50)
    })

    it('clamps negative space_remaining to 0', () => {
      expect(ResourcesService.computeWarehouseFullInSeconds({
        space_remaining: -10,
        earnings_per_second: 2,
      })).toBe(0)
    })
  })
})

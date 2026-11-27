import assert from 'assert'
import { DEFENSE_BUILD_QUEUE_LIMIT } from '#core/defense/constant/build-queue'
import { DefenseCode } from '#core/defense/constant/code'
import { DefenseError } from '#core/defense/error'
import { DefenseService } from '#core/defense/service'

describe('DefenseService', () => {
  it('gives 20 defense points per Enceinte level', () => {
    assert.strictEqual(DefenseService.getCapacity({ city_wall_level: 0 }), 0)
    assert.strictEqual(DefenseService.getCapacity({ city_wall_level: 3 }), 60)
  })

  it('counts points per unit', () => {
    assert.strictEqual(DefenseService.getTotalPoints([
      {
        code: DefenseCode.RAMPART,
        count: 3 
      },
      {
        code: DefenseCode.TURRET,
        count: 2 
      },
      {
        code: DefenseCode.MINEFIELD,
        count: 1 
      },
      {
        code: DefenseCode.PLASMA_BATTERY,
        count: 1 
      },
      {
        code: DefenseCode.SHIELD_GENERATOR,
        count: 1 
      },
    ]), 3 + 4 + 1 + 5 + 4)
  })

  describe('assertCapacity', () => {
    it('accepts a build that fills the capacity exactly', () => {
      DefenseService.assertCapacity({
        city_wall_level: 1,
        used_points: 10,
        queued_points: 4,
        code: DefenseCode.TURRET,
        count: 3,
      })
    })

    it('rejects a build past 20 × level including queued points', () => {
      assert.throws(() => DefenseService.assertCapacity({
        city_wall_level: 1,
        used_points: 10,
        queued_points: 5,
        code: DefenseCode.TURRET,
        count: 3,
      }), new Error(DefenseError.CAPACITY_EXCEEDED))
    })
  })

  it('opens the fortification queue once the Enceinte is built', () => {
    assert.strictEqual(DefenseService.getBuildQueueLimit({ city_wall_level: 0 }), 0)
    assert.strictEqual(DefenseService.getBuildQueueLimit({ city_wall_level: 1 }), DEFENSE_BUILD_QUEUE_LIMIT)
    assert.strictEqual(DEFENSE_BUILD_QUEUE_LIMIT, 3)
  })

  it('creates one row per defense type at count 0', () => {
    const defenses = DefenseService.init({
      player_id: 'p',
      city_id: 'c',
    })
    assert.deepStrictEqual(defenses.map(defense => defense.code).sort(), Object.values(DefenseCode).sort())
    assert.ok(defenses.every(defense => defense.count === 0 && defense.city_id === 'c' && defense.player_id === 'p'))
  })

  it('arms only turrets and plasma batteries', () => {
    assert.deepStrictEqual(
      Object.values(DefenseCode).filter(code => DefenseService.isArmed(code)).sort(),
      [
        DefenseCode.PLASMA_BATTERY,
        DefenseCode.TURRET 
      ]
    )
  })
})

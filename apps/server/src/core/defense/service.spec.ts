import assert from 'assert'
import { DEFENSE_BUILD_QUEUE_LIMIT } from '#core/defense/constant/build-queue'
import { DefenseCode } from '#core/defense/constant/code'
import { DefenseError } from '#core/defense/error'
import { DefenseService } from '#core/defense/service'
import { FactionCode } from '#core/faction/constant/code'

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

  it('arms only turrets, plasma batteries, spore clouds, field artillery and railguns', () => {
    assert.deepStrictEqual(
      Object.values(DefenseCode).filter(code => DefenseService.isArmed(code)).sort(),
      [
        DefenseCode.FIELD_ARTILLERY,
        DefenseCode.PLASMA_BATTERY,
        DefenseCode.RAILGUN,
        DefenseCode.SPORE_CLOUD,
        DefenseCode.TURRET 
      ]
    )
  })

  describe('faction defenses (slice 036)', () => {
    it('keeps the five common defenses for every faction and adds each faction\'s own (slices 036 / 037 / 039)', () => {
      const common = [
        DefenseCode.RAMPART,
        DefenseCode.TURRET,
        DefenseCode.MINEFIELD,
        DefenseCode.PLASMA_BATTERY,
        DefenseCode.SHIELD_GENERATOR,
      ]
      const with_own = [
        FactionCode.THE_SYMBIOSIS,
        FactionCode.THE_BASTION_ORDER,
        FactionCode.THE_CONFEDERATION
      ]
      for (const faction_code of Object.values(FactionCode).filter(code => !with_own.includes(code))) {
        assert.deepStrictEqual(DefenseService.codesForFaction(faction_code).sort(), [ ...common ].sort())
      }
      assert.deepStrictEqual(DefenseService.codesForFaction(FactionCode.THE_SYMBIOSIS).sort(), [
        ...common,
        DefenseCode.MYCELIUM_WALL,
        DefenseCode.SPORE_CLOUD,
      ].sort())
      assert.deepStrictEqual(DefenseService.codesForFaction(FactionCode.THE_BASTION_ORDER).sort(), [
        ...common,
        DefenseCode.FIELD_ARTILLERY,
        DefenseCode.BARBED_WIRE,
      ].sort())
      assert.deepStrictEqual(DefenseService.codesForFaction(FactionCode.THE_CONFEDERATION).sort(), [
        ...common,
        DefenseCode.RAILGUN,
        DefenseCode.HOLO_DECOY,
      ].sort())
    })

    it('keeps the Confederation defenses to the Confederation (slice 039)', () => {
      for (const defense_code of [
        DefenseCode.RAILGUN,
        DefenseCode.HOLO_DECOY
      ]) {
        for (const faction_code of Object.values(FactionCode).filter(code => code !== FactionCode.THE_CONFEDERATION)) {
          assert.throws(() => DefenseService.assertInRoster({
            faction_code,
            defense_code
          }), new RegExp(DefenseError.NOT_IN_FACTION_ROSTER))
        }
        assert.doesNotThrow(() => DefenseService.assertInRoster({
          faction_code: FactionCode.THE_CONFEDERATION,
          defense_code
        }))
      }
    })

    it('keeps the Bastion defenses to the Bastion (slice 037)', () => {
      for (const defense_code of [
        DefenseCode.FIELD_ARTILLERY,
        DefenseCode.BARBED_WIRE
      ]) {
        for (const faction_code of [
          FactionCode.THE_CONFEDERATION,
          FactionCode.THE_SYMBIOSIS
        ]) {
          assert.throws(() => DefenseService.assertInRoster({
            faction_code,
            defense_code
          }), new RegExp(DefenseError.NOT_IN_FACTION_ROSTER))
        }
        assert.doesNotThrow(() => DefenseService.assertInRoster({
          faction_code: FactionCode.THE_BASTION_ORDER,
          defense_code
        }))
      }
    })

    it('rejects a faction defense outside its faction', () => {
      assert.throws(() => DefenseService.assertInRoster({
        faction_code: FactionCode.THE_CONFEDERATION,
        defense_code: DefenseCode.SPORE_CLOUD
      }), new RegExp(DefenseError.NOT_IN_FACTION_ROSTER))
      assert.doesNotThrow(() => DefenseService.assertInRoster({
        faction_code: FactionCode.THE_SYMBIOSIS,
        defense_code: DefenseCode.SPORE_CLOUD
      }))
      assert.doesNotThrow(() => DefenseService.assertInRoster({
        faction_code: FactionCode.THE_CONFEDERATION,
        defense_code: DefenseCode.RAMPART
      }))
    })

    it('reads per-round attack tables and falls back to the flat attack (slice 037)', () => {
      assert.deepStrictEqual([
        1,
        2,
        3,
        4,
        5
      ].map(round => DefenseService.getAttackForRound({
        code: DefenseCode.FIELD_ARTILLERY,
        round
      })), [
        60,
        50,
        25,
        20,
        20
      ])
      assert.deepStrictEqual([
        1,
        2,
        5
      ].map(round => DefenseService.getAttackForRound({
        code: DefenseCode.MINEFIELD,
        round
      })), [
        40,
        0,
        0
      ])
      assert.strictEqual(DefenseService.getAttackForRound({
        code: DefenseCode.TURRET,
        round: 3
      }), 25)
      assert.strictEqual(DefenseService.getAttackForRound({
        code: DefenseCode.FIELD_ARTILLERY,
        round: 6
      }), 20)
    })

    it('regrows floor(30 %) of the destroyed mycelium walls only when the defender holds', () => {
      assert.strictEqual(DefenseService.getRegrowth({
        code: DefenseCode.MYCELIUM_WALL,
        destroyed: 10,
        defender_held: true
      }), 3)
      assert.strictEqual(DefenseService.getRegrowth({
        code: DefenseCode.MYCELIUM_WALL,
        destroyed: 7,
        defender_held: true
      }), 2)
      assert.strictEqual(DefenseService.getRegrowth({
        code: DefenseCode.MYCELIUM_WALL,
        destroyed: 3,
        defender_held: true
      }), 0)
      assert.strictEqual(DefenseService.getRegrowth({
        code: DefenseCode.MYCELIUM_WALL,
        destroyed: 10,
        defender_held: false
      }), 0)
      assert.strictEqual(DefenseService.getRegrowth({
        code: DefenseCode.RAMPART,
        destroyed: 10,
        defender_held: true
      }), 0)
    })
  })
})

import assert from 'assert'
import { CellEntity } from '#core/world/cell/entity'
import { CellType } from '#core/world/value/cell-type'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { TroopCode } from '#core/troop/constant/code'
import { TroopEntity } from '#core/troop/entity'
import { id } from '#shared/identification'
import {
  accumulateCombatArmyCounts,
  emptySystemCombatArmyCounts,
  isSystemCombatArmyReady,
  shouldBoostCombatRecruit,
  SYSTEM_MIN_INTERCEPTOR_CLASS,
  SYSTEM_MIN_LEGIONNAIRE_CLASS,
  SYSTEM_DISRUPTOR_RATIO,
  SYSTEM_TARGET_WAR_MACHINE,
} from './troops'
import {
  combatStacksForAttack,
  scoreAttackTarget,
} from './combat-policy'

describe('system combat army readiness', () => {
  it('requires all four combat classes, war_machine target, and disruptor ratio', () => {
    const counts = emptySystemCombatArmyCounts()
    assert.strictEqual(isSystemCombatArmyReady(counts), false)

    counts.war_machine = SYSTEM_TARGET_WAR_MACHINE
    counts.legionnaire = SYSTEM_MIN_LEGIONNAIRE_CLASS
    counts.interceptor = SYSTEM_MIN_INTERCEPTOR_CLASS
    counts.total_combat = counts.war_machine + counts.legionnaire + counts.interceptor
    assert.strictEqual(isSystemCombatArmyReady(counts), false)

    counts.disruptor = 13
    counts.total_combat = counts.war_machine + counts.legionnaire + counts.interceptor + counts.disruptor
    assert.strictEqual(isSystemCombatArmyReady(counts), true)
  })

  it('boosts combat recruit when basics are ok and army is not ready', () => {
    const counts = emptySystemCombatArmyCounts()
    assert.strictEqual(shouldBoostCombatRecruit({
      army_counts: counts,
      has_city: true,
      main_city_stock: {
        plastic: 10,
        mushroom: 0,
        plasma: 0,
      },
    }), true)
    assert.strictEqual(shouldBoostCombatRecruit({
      army_counts: counts,
      has_city: false,
      main_city_stock: {
        plastic: 10,
        mushroom: 0,
        plasma: 0,
      },
    }), false)
  })
})

describe('scoreAttackTarget', () => {
  const cell = CellEntity.create({
    id: id(),
    coordinates: {
      x: 2,
      y: 2,
    },
    type: CellType.LAKE,
    resource_coefficient: {
      plastic: 1,
      mushroom: 1,
      plasma: 0,
    },
    solar_coefficient: 1,
  })

  it('prefers cities over field stacks with similar garrison', () => {
    const city_score = scoreAttackTarget({
      target_kind: BattleTargetKind.CITY,
      cell,
      defender_combat_count: 5,
    })
    const field_score = scoreAttackTarget({
      target_kind: BattleTargetKind.FIELD,
      cell,
      defender_combat_count: 5,
    })
    assert.ok(city_score > field_score)
  })
})

describe('combatStacksForAttack', () => {
  it('includes full combat garrison without capping stack size', () => {
    const stacks = combatStacksForAttack([
      TroopEntity.create({
        id: id(),
        player_id: id(),
        cell_id: id(),
        code: TroopCode.WAR_MACHINE,
        count: 25,
        movement_id: null,
      }),
      TroopEntity.create({
        id: id(),
        player_id: id(),
        cell_id: id(),
        code: TroopCode.HAULER,
        count: 3,
        movement_id: null,
      }),
    ])
    assert.deepStrictEqual(stacks, [
      {
        code: TroopCode.WAR_MACHINE,
        count: 25,
      },
    ])
  })
})

describe('accumulateCombatArmyCounts', () => {
  it('counts faction combat codes empire-wide', () => {
    const counts = emptySystemCombatArmyCounts()
    accumulateCombatArmyCounts(counts, [
      TroopEntity.create({
        id: id(),
        player_id: id(),
        cell_id: id(),
        code: TroopCode.WAR_MACHINE,
        count: 3,
        movement_id: null,
      }),
      TroopEntity.create({
        id: id(),
        player_id: id(),
        cell_id: id(),
        code: TroopCode.LEGIONNAIRE,
        count: 2,
        movement_id: null,
      }),
    ])
    assert.strictEqual(counts.war_machine, 3)
    assert.strictEqual(counts.legionnaire, 2)
    assert.strictEqual(counts.total_combat, 5)
  })
})

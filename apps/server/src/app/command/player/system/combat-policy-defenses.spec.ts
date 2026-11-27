import assert from 'assert'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { BattleWinner } from '#core/combat/value/battle-winner'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { DefenseCode } from '#core/defense/constant/code'
import { FactionCode } from '#core/faction/constant/code'
import { TroopCode } from '#core/troop/constant/code'
import {
  attackStrategyCandidates,
  pickAttackerStrategyForDefender,
  shouldConsiderSiegeAssault,
  simulateAttackCommit,
  simulatedDefenderModifiers,
} from './combat-policy'

describe('system combat policy with city defenses (slice 029)', () => {
  it('includes the target defenses in the attack simulation', () => {
    const move_troops = [
      {
        code: TroopCode.LEGIONNAIRE,
        count: 10 
      } 
    ]
    assert.strictEqual(simulateAttackCommit({
      move_troops,
      defender_stacks: [
        {
          code: TroopCode.LEGIONNAIRE,
          count: 1 
        } 
      ],
      attacker_strategy: CombatStrategy.BALANCED,
    }), BattleWinner.ATTACKER)
    assert.notStrictEqual(simulateAttackCommit({
      move_troops,
      defender_stacks: [
        {
          code: TroopCode.LEGIONNAIRE,
          count: 1 
        },
        {
          kind: 'defense',
          code: DefenseCode.TURRET,
          count: 30 
        },
      ],
      attacker_strategy: CombatStrategy.BALANCED,
    }), BattleWinner.ATTACKER)
  })

  it('ignores defenses when reading the garrison classes', () => {
    assert.strictEqual(pickAttackerStrategyForDefender([
      {
        code: TroopCode.WAR_MACHINE,
        count: 3 
      },
      {
        kind: 'defense',
        code: DefenseCode.RAMPART,
        count: 50 
      },
    ]), CombatStrategy.OPENING_STRIKE)
  })

  it('considers siege_assault when defense points exceed 30 % of the combat troops life pool', () => {
    // 10 legionnaires: life 150 → threshold 45 points.
    assert.strictEqual(shouldConsiderSiegeAssault([
      {
        code: TroopCode.LEGIONNAIRE,
        count: 10 
      },
      {
        kind: 'defense',
        code: DefenseCode.RAMPART,
        count: 45 
      },
    ]), false)
    assert.strictEqual(shouldConsiderSiegeAssault([
      {
        code: TroopCode.LEGIONNAIRE,
        count: 10 
      },
      {
        kind: 'defense',
        code: DefenseCode.RAMPART,
        count: 46 
      },
    ]), true)
    assert.strictEqual(shouldConsiderSiegeAssault([
      {
        kind: 'defense',
        code: DefenseCode.RAMPART,
        count: 1 
      } 
    ]), true)
    assert.strictEqual(shouldConsiderSiegeAssault([
      {
        code: TroopCode.LEGIONNAIRE,
        count: 10 
      } 
    ]), false)
  })

  it('tries siege_assault first, then the usual strategy', () => {
    assert.deepStrictEqual(attackStrategyCandidates([
      {
        code: TroopCode.WAR_MACHINE,
        count: 1 
      },
      {
        kind: 'defense',
        code: DefenseCode.TURRET,
        count: 20 
      },
    ]), [
      CombatStrategy.SIEGE_ASSAULT,
      CombatStrategy.OPENING_STRIKE 
    ])
    assert.deepStrictEqual(attackStrategyCandidates([
      {
        code: TroopCode.WAR_MACHINE,
        count: 1 
      } 
    ]), [ CombatStrategy.OPENING_STRIKE ])
  })
})

describe('system combat policy against l\'Ordre du Bastion (slice 037)', () => {
  it('simulates the garrison bonus for Bastion city targets only', () => {
    assert.deepStrictEqual(simulatedDefenderModifiers({
      target_kind: BattleTargetKind.CITY,
      defender_faction_code: FactionCode.THE_BASTION_ORDER,
    }), {
      attack: 1,
      life: 1,
      garrison: 1.15,
    })
    assert.strictEqual(simulatedDefenderModifiers({
      target_kind: BattleTargetKind.OUTPOST,
      defender_faction_code: FactionCode.THE_BASTION_ORDER,
    }), undefined)
    assert.strictEqual(simulatedDefenderModifiers({
      target_kind: BattleTargetKind.FIELD,
      defender_faction_code: FactionCode.THE_BASTION_ORDER,
    }), undefined)
    assert.strictEqual(simulatedDefenderModifiers({
      target_kind: BattleTargetKind.CITY,
      defender_faction_code: FactionCode.THE_CONFEDERATION,
    }), undefined)
  })

  it('includes the field artillery in the attack simulation', () => {
    const move_troops = [
      {
        code: TroopCode.LEGIONNAIRE,
        count: 10
      }
    ]
    assert.notStrictEqual(simulateAttackCommit({
      move_troops,
      defender_stacks: [
        {
          kind: 'defense',
          code: DefenseCode.FIELD_ARTILLERY,
          count: 10
        },
      ],
      attacker_strategy: CombatStrategy.BALANCED,
    }), BattleWinner.ATTACKER)
  })
})

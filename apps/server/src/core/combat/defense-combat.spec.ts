import assert from 'node:assert/strict'
import {
  describe, it 
} from 'vitest'
import { CombatService } from '#core/combat/combat-service'
import { getStrategyMultipliers } from '#core/combat/constant/strategy'
import { EXPOSURE_LIFE_MULT } from '#core/combat/constant/exposure'
import {
  BattleCasualtyLine,
  BattleStack,
  CombatModifiers,
  DefenseBattleStack,
} from '#core/combat/type/battle-stack'
import { BattleWinner } from '#core/combat/value/battle-winner'
import {
  CombatStrategy,
  isCombatStrategy
} from '#core/combat/value/combat-strategy'
import { CombatTroopClass } from '#core/combat/value/combat-troop-class'
import { DefenseCode } from '#core/defense/constant/code'
import { TroopCode } from '#core/troop/constant/code'

const defense = (code: DefenseCode, count: number): DefenseBattleStack => ({
  kind: 'defense',
  code,
  count,
})

const legionnaires = (count: number): BattleStack => ({
  code: TroopCode.LEGIONNAIRE,
  count,
})

function round({
  attacker_stacks,
  defender_stacks,
  attacker_strategy = CombatStrategy.BALANCED,
  defender_strategy = CombatStrategy.BALANCED,
  defender_modifiers,
  defender_plasma,
  round_number = 1,
}: {
  attacker_stacks: BattleStack[]
  defender_stacks: BattleStack[]
  attacker_strategy?: CombatStrategy
  defender_strategy?: CombatStrategy
  defender_modifiers?: CombatModifiers
  defender_plasma?: number
  round_number?: number
}) {
  return CombatService.advanceRound({
    round: round_number,
    attacker_stacks,
    defender_stacks,
    attacker_strategy,
    defender_strategy,
    defender_modifiers,
    defender_plasma,
  })
}

const codesOf = (lines: BattleCasualtyLine[]): string[] => lines.map(line => line.code)

describe('CombatService city defenses (slice 029)', () => {
  describe('pools', () => {
    it('ramparts add life only', () => {
      const without = round({
        attacker_stacks: [ legionnaires(10) ],
        defender_stacks: [ legionnaires(10) ],
      })
      const with_ramparts = round({
        attacker_stacks: [ legionnaires(10) ],
        defender_stacks: [
          legionnaires(10),
          defense(DefenseCode.RAMPART, 10) 
        ],
      })

      assert.equal(with_ramparts.round_summary.defender_attack_pool, without.round_summary.defender_attack_pool)
      assert.equal(with_ramparts.round_summary.defender_life_pool, without.round_summary.defender_life_pool + 600)
    })

    it('exposure ignores defense stacks and does not shrink defense life', () => {
      const result = round({
        attacker_stacks: [ legionnaires(10) ],
        defender_stacks: [
          legionnaires(10),
          defense(DefenseCode.RAMPART, 10) 
        ],
      })
      assert.equal(result.round_summary.defender_life_pool, Math.floor(10 * 15 * EXPOSURE_LIFE_MULT) + 600)
    })

    it('minefields attack in round 1 only, are not in the life pool, then the whole stack is consumed', () => {
      const first = round({
        attacker_stacks: [ legionnaires(10) ],
        defender_stacks: [
          defense(DefenseCode.TURRET, 10),
          defense(DefenseCode.MINEFIELD, 10) 
        ],
      })

      assert.equal(first.round_summary.defender_attack_pool, 10 * 25 + 10 * 40)
      assert.equal(first.round_summary.defender_life_pool, 10 * 20)
      assert.ok(!first.defender_stacks.some(stack => stack.code === DefenseCode.MINEFIELD))
      assert.deepStrictEqual(
        first.round_summary.defender_losses.find(line => line.code === DefenseCode.MINEFIELD),
        {
          kind: 'defense',
          code: DefenseCode.MINEFIELD,
          count: 10 
        }
      )

      const later = round({
        round_number: 2,
        attacker_stacks: [ legionnaires(10) ],
        defender_stacks: [
          defense(DefenseCode.TURRET, 10),
          defense(DefenseCode.MINEFIELD, 10) 
        ],
      })
      assert.equal(later.round_summary.defender_attack_pool, 10 * 25)
    })

    it('plasma batteries fire up to the available plasma and report what they spent', () => {
      const limited = round({
        attacker_stacks: [ legionnaires(10) ],
        defender_stacks: [ defense(DefenseCode.PLASMA_BATTERY, 5) ],
        defender_plasma: 12,
      })
      assert.equal(limited.round_summary.defender_plasma_spent, 10)
      assert.equal(limited.round_summary.defender_attack_pool, 2 * 80)
      assert.equal(limited.round_summary.defender_life_pool, 5 * 30)

      const unlimited = round({
        attacker_stacks: [ legionnaires(10) ],
        defender_stacks: [ defense(DefenseCode.PLASMA_BATTERY, 5) ],
      })
      assert.equal(unlimited.round_summary.defender_plasma_spent, 25)
      assert.equal(unlimited.round_summary.defender_attack_pool, 5 * 80)

      const dry = round({
        attacker_stacks: [ legionnaires(10) ],
        defender_stacks: [ defense(DefenseCode.PLASMA_BATTERY, 5) ],
        defender_plasma: 4,
      })
      assert.equal(dry.round_summary.defender_plasma_spent, 0)
      assert.equal(dry.round_summary.defender_attack_pool, 0)
    })

    it('debits battery plasma across the rounds of a simulated battle', () => {
      const result = CombatService.simulateBattle({
        attacker_stacks: [ legionnaires(5) ],
        defender_stacks: [
          defense(DefenseCode.PLASMA_BATTERY, 5),
          defense(DefenseCode.RAMPART, 20) 
        ],
        attacker_strategy: CombatStrategy.BALANCED,
        defender_strategy: CombatStrategy.BALANCED,
        defender_plasma: 12,
      })

      assert.equal(result.round_summaries[0].defender_plasma_spent, 10)
      const total = result.round_summaries.reduce((sum, summary) => sum + (summary.defender_plasma_spent ?? 0), 0)
      assert.equal(total, 10)
    })

    it('shield generators reduce the attacker attack pool by 2 % each, capped at 30 %', () => {
      const neutral = round({
        attacker_stacks: [ legionnaires(100) ],
        defender_stacks: [ legionnaires(5) ],
      })
      const five = round({
        attacker_stacks: [ legionnaires(100) ],
        defender_stacks: [
          legionnaires(5),
          defense(DefenseCode.SHIELD_GENERATOR, 5) 
        ],
      })
      const twenty = round({
        attacker_stacks: [ legionnaires(100) ],
        defender_stacks: [
          legionnaires(5),
          defense(DefenseCode.SHIELD_GENERATOR, 20) 
        ],
      })

      assert.equal(neutral.round_summary.shield_reduction, 0)
      assert.ok(Math.abs((five.round_summary.shield_reduction ?? 0) - 0.1) < 1e-9)
      assert.ok(Math.abs(five.round_summary.attacker_attack_pool - neutral.round_summary.attacker_attack_pool * 0.9) < 1e-6)
      assert.equal(twenty.round_summary.shield_reduction, 0.3)
      assert.ok(Math.abs(twenty.round_summary.attacker_attack_pool - neutral.round_summary.attacker_attack_pool * 0.7) < 1e-6)
    })

    it('Fortification scales defenses only', () => {
      const stacks = [
        legionnaires(5),
        defense(DefenseCode.TURRET, 10) 
      ]
      const neutral = round({
        attacker_stacks: [ legionnaires(10) ],
        defender_stacks: stacks,
      })
      const fortified = round({
        attacker_stacks: [ legionnaires(10) ],
        defender_stacks: stacks,
        defender_modifiers: {
          attack: 1,
          life: 1,
          fortification: 1.09,
        },
      })

      assert.ok(Math.abs(fortified.round_summary.defender_attack_pool - (5 * 11 + 10 * 25 * 1.09)) < 1e-6)
      assert.ok(Math.abs(fortified.round_summary.defender_life_pool - (Math.floor(5 * 15 * EXPOSURE_LIFE_MULT) + 10 * 20 * 1.09)) < 1e-6)
      assert.equal(neutral.round_summary.defender_attack_pool, 5 * 11 + 10 * 25)
    })

    it('Arsenal modifiers and strategy multipliers do not apply to defenses', () => {
      const result = round({
        attacker_stacks: [ legionnaires(10) ],
        defender_stacks: [ defense(DefenseCode.TURRET, 10) ],
        defender_strategy: CombatStrategy.HOLD_THE_LINE,
        defender_modifiers: {
          attack: 1.5,
          life: 1.5,
        },
      })
      assert.equal(result.round_summary.defender_attack_pool, 250)
      assert.equal(result.round_summary.defender_life_pool, 200)
    })
  })

  describe('casualties', () => {
    it('ramparts die first', () => {
      const result = round({
        attacker_stacks: [ legionnaires(300) ],
        defender_stacks: [
          legionnaires(5),
          defense(DefenseCode.RAMPART, 10) 
        ],
      })
      assert.deepStrictEqual(result.round_summary.defender_losses, [
        {
          kind: 'defense',
          code: DefenseCode.RAMPART,
          count: 4 
        } 
      ])
    })

    it('follows rampart → combat troops → turret → shield generator outside siege', () => {
      const result = round({
        attacker_stacks: [ legionnaires(10_000) ],
        defender_stacks: [
          defense(DefenseCode.SHIELD_GENERATOR, 3),
          defense(DefenseCode.TURRET, 2),
          legionnaires(5),
          defense(DefenseCode.RAMPART, 2),
        ],
      })
      assert.deepStrictEqual(codesOf(result.round_summary.defender_losses), [
        DefenseCode.RAMPART,
        TroopCode.LEGIONNAIRE,
        DefenseCode.TURRET,
        DefenseCode.SHIELD_GENERATOR,
      ])
    })

    it('follows rampart → shield generator → plasma battery → turret → combat troops under siege_assault', () => {
      const result = round({
        attacker_strategy: CombatStrategy.SIEGE_ASSAULT,
        attacker_stacks: [ legionnaires(10_000) ],
        defender_stacks: [
          legionnaires(5),
          defense(DefenseCode.TURRET, 2),
          defense(DefenseCode.PLASMA_BATTERY, 1),
          defense(DefenseCode.SHIELD_GENERATOR, 3),
          defense(DefenseCode.RAMPART, 2),
        ],
      })
      assert.deepStrictEqual(codesOf(result.round_summary.defender_losses), [
        DefenseCode.RAMPART,
        DefenseCode.SHIELD_GENERATOR,
        DefenseCode.PLASMA_BATTERY,
        DefenseCode.TURRET,
        TroopCode.LEGIONNAIRE,
      ])
    })

    it('counts defense life at 75 % when the attacker uses siege_assault', () => {
      const balanced = round({
        attacker_stacks: [ legionnaires(10) ],
        defender_stacks: [ defense(DefenseCode.RAMPART, 10) ],
      })
      const siege = round({
        attacker_strategy: CombatStrategy.SIEGE_ASSAULT,
        attacker_stacks: [ legionnaires(10) ],
        defender_stacks: [ defense(DefenseCode.RAMPART, 10) ],
      })
      assert.equal(balanced.round_summary.defender_life_pool, 600)
      assert.equal(siege.round_summary.defender_life_pool, 450)
    })

    it('a siege_assault garrison default has no effect on its own defenses', () => {
      const result = round({
        attacker_stacks: [ legionnaires(10) ],
        defender_stacks: [ defense(DefenseCode.RAMPART, 10) ],
        defender_strategy: CombatStrategy.SIEGE_ASSAULT,
      })
      assert.equal(result.round_summary.defender_life_pool, 600)
    })
  })

  describe('victory', () => {
    it('a defender with turrets but no troops keeps fighting', () => {
      const result = round({
        attacker_stacks: [ legionnaires(10) ],
        defender_stacks: [ defense(DefenseCode.TURRET, 10) ],
      })
      assert.equal(result.winner, null)
    })

    it('a defender with only ramparts and shields loses', () => {
      const result = round({
        attacker_stacks: [ legionnaires(10) ],
        defender_stacks: [
          defense(DefenseCode.RAMPART, 10),
          defense(DefenseCode.SHIELD_GENERATOR, 2) 
        ],
      })
      assert.equal(result.winner, BattleWinner.ATTACKER)
    })
  })

  describe('siege_assault strategy', () => {
    it('is a valid strategy with flat multipliers on every round', () => {
      assert.ok(isCombatStrategy('siege_assault'))
      for (let r = 1; r <= 5; r++) {
        assert.deepStrictEqual(
          getStrategyMultipliers({
            strategy: CombatStrategy.SIEGE_ASSAULT,
            round: r,
            troop_class: CombatTroopClass.WAR_MACHINE 
          }),
          {
            attack: 1.25,
            life: 1 
          }
        )
        assert.deepStrictEqual(
          getStrategyMultipliers({
            strategy: CombatStrategy.SIEGE_ASSAULT,
            round: r,
            troop_class: CombatTroopClass.LEGIONNAIRE 
          }),
          {
            attack: 0.85,
            life: 0.95 
          }
        )
      }
    })
  })

  it('merges defense loss lines with their kind', () => {
    const merged = CombatService.mergeCumulativeLosses(
      [
        {
          code: TroopCode.LEGIONNAIRE,
          count: 1 
        },
        {
          kind: 'defense',
          code: DefenseCode.RAMPART,
          count: 2 
        } 
      ],
      [
        {
          kind: 'defense',
          code: DefenseCode.RAMPART,
          count: 3 
        } 
      ]
    )
    assert.deepStrictEqual(merged, [
      {
        code: TroopCode.LEGIONNAIRE,
        count: 1 
      },
      {
        kind: 'defense',
        code: DefenseCode.RAMPART,
        count: 5 
      },
    ])
  })
})

describe('CombatService Symbiose faction defenses (slice 036)', () => {
  it('mycelium walls add life only and take losses first, with the ramparts', () => {
    const result = round({
      attacker_stacks: [ legionnaires(10_000) ],
      defender_stacks: [
        defense(DefenseCode.SPORE_CLOUD, 2),
        legionnaires(5),
        defense(DefenseCode.MYCELIUM_WALL, 3),
      ],
    })
    assert.deepStrictEqual(codesOf(result.round_summary.defender_losses), [
      DefenseCode.MYCELIUM_WALL,
      TroopCode.LEGIONNAIRE,
      DefenseCode.SPORE_CLOUD,
    ])

    const walls = round({
      attacker_stacks: [ legionnaires(10) ],
      defender_stacks: [ defense(DefenseCode.MYCELIUM_WALL, 10) ],
    })
    assert.equal(walls.round_summary.defender_attack_pool, 0)
    assert.equal(walls.round_summary.defender_life_pool, 500)
  })

  it('places mycelium walls with ramparts and spore clouds with turrets under siege_assault', () => {
    const result = round({
      attacker_strategy: CombatStrategy.SIEGE_ASSAULT,
      attacker_stacks: [ legionnaires(10_000) ],
      defender_stacks: [
        legionnaires(5),
        defense(DefenseCode.SPORE_CLOUD, 2),
        defense(DefenseCode.SHIELD_GENERATOR, 3),
        defense(DefenseCode.MYCELIUM_WALL, 2),
      ],
    })
    assert.deepStrictEqual(codesOf(result.round_summary.defender_losses), [
      DefenseCode.MYCELIUM_WALL,
      DefenseCode.SHIELD_GENERATOR,
      DefenseCode.SPORE_CLOUD,
      TroopCode.LEGIONNAIRE,
    ])
  })

  it('spore clouds attack and reduce the attacker attack pool by 1 % each, capped at 15 %', () => {
    const neutral = round({
      attacker_stacks: [ legionnaires(100) ],
      defender_stacks: [ legionnaires(5) ],
    })
    const five = round({
      attacker_stacks: [ legionnaires(100) ],
      defender_stacks: [
        legionnaires(5),
        defense(DefenseCode.SPORE_CLOUD, 5),
      ],
    })
    const thirty = round({
      attacker_stacks: [ legionnaires(100) ],
      defender_stacks: [
        legionnaires(5),
        defense(DefenseCode.SPORE_CLOUD, 30),
      ],
    })

    assert.equal(neutral.round_summary.spore_reduction, 0)
    assert.ok(Math.abs((five.round_summary.spore_reduction ?? 0) - 0.05) < 1e-9)
    assert.ok(Math.abs(five.round_summary.attacker_attack_pool - neutral.round_summary.attacker_attack_pool * 0.95) < 1e-6)
    assert.equal(five.round_summary.defender_attack_pool, neutral.round_summary.defender_attack_pool + 5 * 12)
    assert.ok(Math.abs((thirty.round_summary.spore_reduction ?? 0) - 0.15) < 1e-9)
    assert.ok(Math.abs(thirty.round_summary.attacker_attack_pool - neutral.round_summary.attacker_attack_pool * 0.85) < 1e-6)
  })

  it('caps shield generators and spore clouds at 40 % together', () => {
    const neutral = round({
      attacker_stacks: [ legionnaires(100) ],
      defender_stacks: [ legionnaires(5) ],
    })
    const both = round({
      attacker_stacks: [ legionnaires(100) ],
      defender_stacks: [
        legionnaires(5),
        defense(DefenseCode.SHIELD_GENERATOR, 20),
        defense(DefenseCode.SPORE_CLOUD, 20),
      ],
    })
    const under_cap = round({
      attacker_stacks: [ legionnaires(100) ],
      defender_stacks: [
        legionnaires(5),
        defense(DefenseCode.SHIELD_GENERATOR, 10),
        defense(DefenseCode.SPORE_CLOUD, 10),
      ],
    })

    assert.equal(both.round_summary.shield_reduction, 0.3)
    assert.ok(Math.abs((both.round_summary.spore_reduction ?? 0) - 0.1) < 1e-9)
    assert.ok(Math.abs(both.round_summary.attacker_attack_pool - neutral.round_summary.attacker_attack_pool * 0.6) < 1e-6)
    assert.ok(Math.abs((under_cap.round_summary.shield_reduction ?? 0) - 0.2) < 1e-9)
    assert.ok(Math.abs((under_cap.round_summary.spore_reduction ?? 0) - 0.1) < 1e-9)
    assert.ok(Math.abs(under_cap.round_summary.attacker_attack_pool - neutral.round_summary.attacker_attack_pool * 0.7) < 1e-6)
  })

  it('spore clouds keep the defender in the fight; mycelium walls alone do not', () => {
    const clouds = round({
      attacker_stacks: [ legionnaires(10) ],
      defender_stacks: [ defense(DefenseCode.SPORE_CLOUD, 10) ],
    })
    assert.equal(clouds.winner, null)

    const walls = round({
      attacker_stacks: [ legionnaires(10) ],
      defender_stacks: [ defense(DefenseCode.MYCELIUM_WALL, 10) ],
    })
    assert.equal(walls.winner, BattleWinner.ATTACKER)
  })
})

import assert from 'node:assert/strict'
import {
  describe, it
} from 'vitest'
import { CombatService } from '#core/combat/combat-service'
import { getStrategyMultipliers } from '#core/combat/constant/strategy'
import {
  BattleCasualtyLine,
  BattleStack,
  CombatModifiers,
  DefenseBattleStack,
} from '#core/combat/type/battle-stack'
import { BattleWinner } from '#core/combat/value/battle-winner'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { CombatTroopClass } from '#core/combat/value/combat-troop-class'
import { DefenseCode } from '#core/defense/constant/code'
import { TroopCode } from '#core/troop/constant/code'

const defense = (code: DefenseCode, count: number): DefenseBattleStack => ({
  kind: 'defense',
  code,
  count,
})

const troops = (code: TroopCode, count: number, player_id?: string): BattleStack => (player_id
  ? {
    code,
    count,
    player_id
  }
  : {
    code,
    count
  })

const legionnaires = (count: number): BattleStack => troops(TroopCode.LEGIONNAIRE, count)

const GARRISON: CombatModifiers = {
  attack: 1,
  life: 1,
  garrison: 1.15,
}

function round({
  attacker_stacks,
  defender_stacks,
  attacker_strategy = CombatStrategy.BALANCED,
  defender_strategy = CombatStrategy.BALANCED,
  defender_modifiers,
  defender_owner_modifiers,
  round_number = 1,
}: {
  attacker_stacks: BattleStack[]
  defender_stacks: BattleStack[]
  attacker_strategy?: CombatStrategy
  defender_strategy?: CombatStrategy
  defender_modifiers?: CombatModifiers
  defender_owner_modifiers?: Record<string, CombatModifiers>
  round_number?: number
}) {
  return CombatService.advanceRound({
    round: round_number,
    attacker_stacks,
    defender_stacks,
    attacker_strategy,
    defender_strategy,
    defender_modifiers,
    defender_owner_modifiers,
  })
}

const codesOf = (lines: BattleCasualtyLine[]): string[] => lines.map(line => line.code)

const close = (actual: number | undefined, expected: number) => assert.ok(
  Math.abs((actual ?? 0) - expected) < 1e-6,
  `${actual} ≉ ${expected}`
)

describe('CombatService Bastion garrison (slice 037)', () => {
  // Two combat classes: no exposure penalty on the defender life pool.
  const garrison_stacks: BattleStack[] = [
    troops(TroopCode.GRENADIER, 10),
    troops(TroopCode.DRAGOON, 10),
  ]

  it('multiplies the life of the side\'s own combat stacks by 1.15, not their attack', () => {
    const plain = round({
      attacker_stacks: [ legionnaires(5) ],
      defender_stacks: garrison_stacks,
    })
    const garrisoned = round({
      attacker_stacks: [ legionnaires(5) ],
      defender_stacks: garrison_stacks,
      defender_modifiers: GARRISON,
    })

    assert.equal(plain.round_summary.defender_life_pool, 10 * 18 + 10 * 6)
    close(garrisoned.round_summary.defender_life_pool, (10 * 18 + 10 * 6) * 1.15)
    assert.equal(garrisoned.round_summary.defender_attack_pool, plain.round_summary.defender_attack_pool)
  })

  it('never applies to reinforcement stacks, with or without owner modifiers', () => {
    const stacks = [
      ...garrison_stacks,
      troops(TroopCode.ROOT_WARDEN, 10, 'ally'),
    ]
    const host_life = 10 * 18 + 10 * 6
    const ally_life = 10 * 12

    const without_owner = round({
      attacker_stacks: [ legionnaires(5) ],
      defender_stacks: stacks,
      defender_modifiers: GARRISON,
    })
    const with_owner = round({
      attacker_stacks: [ legionnaires(5) ],
      defender_stacks: stacks,
      defender_modifiers: GARRISON,
      defender_owner_modifiers: {
        ally: {
          attack: 1,
          life: 1
        }
      },
    })

    close(without_owner.round_summary.defender_life_pool, host_life * 1.15 + ally_life)
    close(with_owner.round_summary.defender_life_pool, host_life * 1.15 + ally_life)
  })

  it('stacks multiplicatively with strategy multipliers and Blindage organique', () => {
    const result = round({
      attacker_stacks: [ legionnaires(5) ],
      defender_stacks: garrison_stacks,
      defender_strategy: CombatStrategy.HOLD_THE_LINE,
      defender_modifiers: {
        attack: 1,
        life: 1.06,
        garrison: 1.15,
      },
    })
    const legion = getStrategyMultipliers({
      strategy: CombatStrategy.HOLD_THE_LINE,
      round: 1,
      troop_class: CombatTroopClass.LEGIONNAIRE,
    }).life
    const interceptor = getStrategyMultipliers({
      strategy: CombatStrategy.HOLD_THE_LINE,
      round: 1,
      troop_class: CombatTroopClass.INTERCEPTOR,
    }).life

    close(result.round_summary.defender_life_pool, (10 * 18 * legion + 10 * 6 * interceptor) * 1.06 * 1.15)
  })

  it('leaves defenses and non-combat troops untouched', () => {
    const plain = round({
      attacker_stacks: [ legionnaires(5) ],
      defender_stacks: [
        troops(TroopCode.SUPPLY_TRUCK, 4),
        defense(DefenseCode.RAMPART, 2),
      ],
    })
    const garrisoned = round({
      attacker_stacks: [ legionnaires(5) ],
      defender_stacks: [
        troops(TroopCode.SUPPLY_TRUCK, 4),
        defense(DefenseCode.RAMPART, 2),
      ],
      defender_modifiers: GARRISON,
    })

    assert.equal(garrisoned.round_summary.defender_life_pool, plain.round_summary.defender_life_pool)
  })
})

describe('CombatService Bastion faction defenses (slice 037)', () => {
  it('field artillery follows its per-round attack table, scaled by Fortification', () => {
    const pools = [
      1,
      2,
      3,
      4,
      5
    ].map(round_number => round({
      round_number,
      attacker_stacks: [ legionnaires(1) ],
      defender_stacks: [ defense(DefenseCode.FIELD_ARTILLERY, 2) ],
      defender_modifiers: {
        attack: 1,
        life: 1,
        fortification: 1.06,
      },
    }).round_summary)

    pools.forEach((summary, index) => close(summary.defender_attack_pool, 2 * [
      60,
      50,
      25,
      20,
      20
    ][index] * 1.06))
    close(pools[0].defender_life_pool, 2 * 35 * 1.06)
  })

  it('barbed wire adds life only and reduces the attacker pool by 1 % per unit in round 1, capped at 10 %', () => {
    const neutral = round({
      attacker_stacks: [ legionnaires(100) ],
      defender_stacks: [ legionnaires(5) ],
    })
    const five = round({
      attacker_stacks: [ legionnaires(100) ],
      defender_stacks: [
        legionnaires(5),
        defense(DefenseCode.BARBED_WIRE, 5),
      ],
    })
    const twenty = round({
      attacker_stacks: [ legionnaires(100) ],
      defender_stacks: [
        legionnaires(5),
        defense(DefenseCode.BARBED_WIRE, 20),
      ],
    })

    assert.equal(neutral.round_summary.barbed_wire_reduction, 0)
    close(five.round_summary.barbed_wire_reduction, 0.05)
    close(five.round_summary.attacker_attack_pool, neutral.round_summary.attacker_attack_pool * 0.95)
    assert.equal(five.round_summary.defender_attack_pool, neutral.round_summary.defender_attack_pool)
    close(twenty.round_summary.barbed_wire_reduction, 0.1)
    close(twenty.round_summary.attacker_attack_pool, neutral.round_summary.attacker_attack_pool * 0.9)

    const walls = round({
      attacker_stacks: [ legionnaires(1) ],
      defender_stacks: [ defense(DefenseCode.BARBED_WIRE, 10) ],
    })
    assert.equal(walls.round_summary.defender_attack_pool, 0)
    assert.equal(walls.round_summary.defender_life_pool, 150)
  })

  it('barbed wire gives 0.5 % per unit in round 2, capped at 5 %, and nothing afterwards', () => {
    const at = (round_number: number, count: number) => round({
      round_number,
      attacker_stacks: [ legionnaires(100) ],
      defender_stacks: [
        legionnaires(5),
        defense(DefenseCode.BARBED_WIRE, count),
      ],
    }).round_summary.barbed_wire_reduction

    close(at(2, 4), 0.02)
    close(at(2, 20), 0.05)
    assert.equal(at(3, 20), 0)
    assert.equal(at(5, 20), 0)
  })

  it('caps shields, spore clouds and barbed wire at 40 % together', () => {
    const neutral = round({
      attacker_stacks: [ legionnaires(100) ],
      defender_stacks: [ legionnaires(5) ],
    })
    const all = (shields: number, spores: number, wire: number) => round({
      attacker_stacks: [ legionnaires(100) ],
      defender_stacks: [
        legionnaires(5),
        defense(DefenseCode.SHIELD_GENERATOR, shields),
        defense(DefenseCode.SPORE_CLOUD, spores),
        defense(DefenseCode.BARBED_WIRE, wire),
      ],
    }).round_summary

    const shield_and_wire = all(20, 0, 20)
    close(shield_and_wire.shield_reduction, 0.3)
    close(shield_and_wire.barbed_wire_reduction, 0.1)
    close(shield_and_wire.attacker_attack_pool, neutral.round_summary.attacker_attack_pool * 0.6)

    const clamped = all(10, 15, 20)
    close(clamped.shield_reduction, 0.2)
    close(clamped.spore_reduction, 0.15)
    close(clamped.barbed_wire_reduction, 0.05)
    close(clamped.attacker_attack_pool, neutral.round_summary.attacker_attack_pool * 0.6)

    const full = all(20, 20, 20)
    close(full.barbed_wire_reduction, 0)
    close(full.attacker_attack_pool, neutral.round_summary.attacker_attack_pool * 0.6)
  })

  it('barbed wire dies first, before ramparts; field artillery dies with the turrets', () => {
    const result = round({
      attacker_stacks: [ legionnaires(10_000) ],
      defender_stacks: [
        defense(DefenseCode.FIELD_ARTILLERY, 2),
        legionnaires(5),
        defense(DefenseCode.RAMPART, 3),
        defense(DefenseCode.BARBED_WIRE, 4),
      ],
    })
    assert.deepStrictEqual(codesOf(result.round_summary.defender_losses), [
      DefenseCode.BARBED_WIRE,
      DefenseCode.RAMPART,
      TroopCode.LEGIONNAIRE,
      DefenseCode.FIELD_ARTILLERY,
    ])
  })

  it('keeps barbed wire, then ramparts, then the 029 siege order under siege_assault', () => {
    const result = round({
      attacker_strategy: CombatStrategy.SIEGE_ASSAULT,
      attacker_stacks: [ legionnaires(10_000) ],
      defender_stacks: [
        legionnaires(5),
        defense(DefenseCode.FIELD_ARTILLERY, 2),
        defense(DefenseCode.SHIELD_GENERATOR, 3),
        defense(DefenseCode.RAMPART, 2),
        defense(DefenseCode.BARBED_WIRE, 2),
      ],
    })
    assert.deepStrictEqual(codesOf(result.round_summary.defender_losses), [
      DefenseCode.BARBED_WIRE,
      DefenseCode.RAMPART,
      DefenseCode.SHIELD_GENERATOR,
      DefenseCode.FIELD_ARTILLERY,
      TroopCode.LEGIONNAIRE,
    ])
  })

  it('field artillery keeps the defender in the fight; barbed wire alone does not', () => {
    const artillery = round({
      attacker_stacks: [ legionnaires(10) ],
      defender_stacks: [ defense(DefenseCode.FIELD_ARTILLERY, 10) ],
    })
    assert.equal(artillery.winner, null)

    const wire = round({
      attacker_stacks: [ legionnaires(10) ],
      defender_stacks: [ defense(DefenseCode.BARBED_WIRE, 10) ],
    })
    assert.equal(wire.winner, BattleWinner.ATTACKER)
  })
})

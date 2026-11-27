import assert from 'node:assert/strict'
import {
  describe, it
} from 'vitest'
import {
  CombatService,
  resolveBattleWinner
} from '#core/combat/combat-service'
import {
  BattleCasualtyLine,
  BattleStack,
  CombatModifiers,
  DefenseBattleStack,
} from '#core/combat/type/battle-stack'
import { BattleWinner } from '#core/combat/value/battle-winner'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { DefenseCode } from '#core/defense/constant/code'
import { TroopCode } from '#core/troop/constant/code'

const defense = (code: DefenseCode, count: number): DefenseBattleStack => ({
  kind: 'defense',
  code,
  count,
})

const troops = (code: TroopCode, count: number): BattleStack => ({
  code,
  count
})

function round({
  attacker_stacks,
  defender_stacks,
  attacker_strategy = CombatStrategy.BALANCED,
  defender_modifiers,
  round_number = 1,
}: {
  attacker_stacks: BattleStack[]
  defender_stacks: BattleStack[]
  attacker_strategy?: CombatStrategy
  defender_modifiers?: CombatModifiers
  round_number?: number
}) {
  return CombatService.advanceRound({
    round: round_number,
    attacker_stacks,
    defender_stacks,
    attacker_strategy,
    defender_strategy: CombatStrategy.BALANCED,
    defender_modifiers,
  })
}

function lossOf(lines: BattleCasualtyLine[], code: DefenseCode | TroopCode): number {
  return lines.filter(line => line.code === code).reduce((sum, line) => sum + line.count, 0)
}

function countOf(stacks: BattleStack[], code: DefenseCode | TroopCode): number {
  return stacks.filter(stack => stack.code === code).reduce((sum, stack) => sum + stack.count, 0)
}

describe('CombatService Confederation railgun (slice 039)', () => {
  const railguns = [ defense(DefenseCode.RAILGUN, 4) ]

  it('fires at its flat attack against a regular assault', () => {
    const result = round({
      attacker_stacks: [ troops(TroopCode.LEGIONNAIRE, 10) ],
      defender_stacks: railguns,
    })

    assert.equal(result.round_summary.defender_attack_pool, 4 * 30)
    assert.equal(result.round_summary.defender_life_pool, 4 * 25)
    assert.equal(result.round_summary.railgun_doubled, false)
  })

  it('doubles its attack when the attacker uses siege_assault', () => {
    const result = round({
      attacker_stacks: [ troops(TroopCode.LEGIONNAIRE, 10) ],
      defender_stacks: railguns,
      attacker_strategy: CombatStrategy.SIEGE_ASSAULT,
    })

    assert.equal(result.round_summary.defender_attack_pool, 4 * 30 * 2)
    assert.equal(result.round_summary.railgun_doubled, true)
  })

  it('doubles its attack when war machines make up at least 50 % of the combat attack pool', () => {
    // 10 war machines (130) against 11 legionnaires (121): 51.8 %.
    const above = round({
      attacker_stacks: [
        troops(TroopCode.WAR_MACHINE, 10),
        troops(TroopCode.LEGIONNAIRE, 11),
      ],
      defender_stacks: railguns,
    })
    // 11 war machines (143) against 13 legionnaires (143): exactly 50 %.
    const exactly = round({
      attacker_stacks: [
        troops(TroopCode.WAR_MACHINE, 11),
        troops(TroopCode.LEGIONNAIRE, 13),
      ],
      defender_stacks: railguns,
    })
    // 10 war machines (130) against 12 legionnaires (132): 49.6 %.
    const below = round({
      attacker_stacks: [
        troops(TroopCode.WAR_MACHINE, 10),
        troops(TroopCode.LEGIONNAIRE, 12),
      ],
      defender_stacks: railguns,
    })

    assert.equal(above.round_summary.defender_attack_pool, 240)
    assert.equal(above.round_summary.railgun_doubled, true)
    assert.equal(exactly.round_summary.railgun_doubled, true)
    assert.equal(below.round_summary.defender_attack_pool, 120)
    assert.equal(below.round_summary.railgun_doubled, false)
  })

  it('counts the war machine share of combat troops only, before shield-type reductions', () => {
    // Carriers add attack but are not combat troops: 10 war machines stay 100 % of the combat attack pool.
    const result = round({
      attacker_stacks: [
        troops(TroopCode.WAR_MACHINE, 10),
        troops(TroopCode.LIGHT_TRANSPORTER, 500),
      ],
      defender_stacks: [
        ...railguns,
        defense(DefenseCode.SHIELD_GENERATOR, 15),
      ],
    })

    assert.equal(result.round_summary.railgun_doubled, true)
    assert.ok((result.round_summary.shield_reduction ?? 0) > 0)
  })

  it('scales with Fortification, doubled or not', () => {
    const result = round({
      attacker_stacks: [ troops(TroopCode.LEGIONNAIRE, 10) ],
      defender_stacks: railguns,
      attacker_strategy: CombatStrategy.SIEGE_ASSAULT,
      defender_modifiers: {
        attack: 1,
        life: 1,
        fortification: 1.1,
      },
    })

    assert.ok(Math.abs(result.round_summary.defender_attack_pool - 4 * 30 * 2 * 1.1) < 1e-9)
  })

  it('reports no doubling without railguns, and leaves other defenses unchanged under siege', () => {
    const result = round({
      attacker_stacks: [ troops(TroopCode.LEGIONNAIRE, 10) ],
      defender_stacks: [ defense(DefenseCode.TURRET, 4) ],
      attacker_strategy: CombatStrategy.SIEGE_ASSAULT,
    })

    assert.equal(result.round_summary.defender_attack_pool, 4 * 25)
    assert.equal(result.round_summary.railgun_doubled, false)
  })

  it('counts for victory as an armed defense', () => {
    assert.equal(resolveBattleWinner({
      attacker_stacks: [],
      defender_stacks: [ defense(DefenseCode.RAILGUN, 1) ],
      round: 1,
      max_round: 5,
    }), BattleWinner.DEFENDER)
    assert.equal(resolveBattleWinner({
      attacker_stacks: [ troops(TroopCode.LEGIONNAIRE, 1) ],
      defender_stacks: [ defense(DefenseCode.RAILGUN, 1) ],
      round: 1,
      max_round: 5,
    }), null)
  })

  it('falls with the turrets: after combat troops normally, before them under siege', () => {
    const defender_stacks = [
      troops(TroopCode.LEGIONNAIRE, 20),
      defense(DefenseCode.RAILGUN, 20),
    ]
    const attacker_stacks = [ troops(TroopCode.INTERCEPTOR, 200) ]

    const normal = round({
      attacker_stacks,
      defender_stacks,
    })
    const siege = round({
      attacker_stacks,
      defender_stacks,
      attacker_strategy: CombatStrategy.SIEGE_ASSAULT,
    })

    assert.equal(normal.round_summary.defender_losses[0].code, TroopCode.LEGIONNAIRE)
    assert.equal(siege.round_summary.defender_losses[0].code, DefenseCode.RAILGUN)
  })
})

describe('CombatService Confederation holo decoys (slice 039)', () => {
  // Defender life pool 10 ramparts × 60 + 10 turrets × 20 = 800 (decoys add none); 728 legionnaires × 11 = 8008
  // attack, so the loss budget is 10 and the decoys' share floor(30 % × 10) = 3.
  const attacker_stacks = [ troops(TroopCode.LEGIONNAIRE, 728) ]
  const walls = [
    defense(DefenseCode.RAMPART, 10),
    defense(DefenseCode.TURRET, 10),
  ]

  it('absorbs at most 30 % of the loss budget, before ramparts, one decoy per loss', () => {
    const result = round({
      attacker_stacks,
      defender_stacks: [
        defense(DefenseCode.HOLO_DECOY, 100),
        ...walls,
      ],
    })

    assert.equal(result.round_summary.defender_life_pool, 800)
    assert.equal(result.round_summary.decoy_absorbed, 3)
    assert.equal(result.round_summary.defender_losses[0].code, DefenseCode.HOLO_DECOY)
    assert.equal(lossOf(result.round_summary.defender_losses, DefenseCode.HOLO_DECOY), 3)
    assert.equal(lossOf(result.round_summary.defender_losses, DefenseCode.RAMPART), 7)
    // Round 1: the other decoys stay for round 2.
    assert.equal(countOf(result.defender_stacks, DefenseCode.HOLO_DECOY), 97)
    assert.equal(result.winner, null)
  })

  it('absorbs only as many losses as there are decoys', () => {
    const result = round({
      attacker_stacks,
      defender_stacks: [
        defense(DefenseCode.HOLO_DECOY, 2),
        ...walls,
      ],
    })

    assert.equal(result.round_summary.decoy_absorbed, 2)
    assert.equal(lossOf(result.round_summary.defender_losses, DefenseCode.RAMPART), 8)
  })

  it('is taken before barbed wire too', () => {
    const result = round({
      attacker_stacks,
      defender_stacks: [
        defense(DefenseCode.BARBED_WIRE, 10),
        defense(DefenseCode.HOLO_DECOY, 100),
        ...walls,
      ],
    })

    assert.equal(result.round_summary.defender_losses[0].code, DefenseCode.HOLO_DECOY)
    assert.ok((result.round_summary.decoy_absorbed ?? 0) > 0)
    assert.ok(lossOf(result.round_summary.defender_losses, DefenseCode.BARBED_WIRE) > 0)
  })

  it('absorbs nothing when 30 % of the loss budget rounds down to 0', () => {
    const result = round({
      attacker_stacks: [ troops(TroopCode.LEGIONNAIRE, 200) ],
      defender_stacks: [
        defense(DefenseCode.HOLO_DECOY, 100),
        ...walls,
      ],
    })

    // 2200 / 800: a loss budget of 2.
    assert.equal(result.round_summary.decoy_absorbed, 0)
    assert.equal(lossOf(result.round_summary.defender_losses, DefenseCode.RAMPART), 2)
  })

  it('absorbs in round 2 and vanishes after it: every decoy left is consumed', () => {
    const result = round({
      attacker_stacks,
      defender_stacks: [
        defense(DefenseCode.HOLO_DECOY, 97),
        ...walls,
      ],
      round_number: 2,
    })

    assert.equal(result.round_summary.decoy_absorbed, 3)
    assert.equal(lossOf(result.round_summary.defender_losses, DefenseCode.HOLO_DECOY), 97)
    assert.equal(countOf(result.defender_stacks, DefenseCode.HOLO_DECOY), 0)
  })

  it('absorbs nothing after round 2', () => {
    const result = round({
      attacker_stacks,
      defender_stacks: [
        defense(DefenseCode.HOLO_DECOY, 50),
        ...walls,
      ],
      round_number: 3,
    })

    assert.equal(result.round_summary.decoy_absorbed, 0)
    assert.equal(lossOf(result.round_summary.defender_losses, DefenseCode.RAMPART), 10)
  })

  it('never counts for victory, and is consumed when the battle ends in round 1', () => {
    assert.equal(resolveBattleWinner({
      attacker_stacks: [ troops(TroopCode.LEGIONNAIRE, 1) ],
      defender_stacks: [ defense(DefenseCode.HOLO_DECOY, 50) ],
      round: 1,
      max_round: 5,
    }), BattleWinner.ATTACKER)

    const result = round({
      attacker_stacks: [ troops(TroopCode.LEGIONNAIRE, 10) ],
      defender_stacks: [
        defense(DefenseCode.HOLO_DECOY, 50),
        defense(DefenseCode.RAMPART, 1),
      ],
    })
    assert.equal(result.winner, BattleWinner.ATTACKER)
    assert.equal(countOf(result.defender_stacks, DefenseCode.HOLO_DECOY), 0)
    assert.equal(lossOf(result.round_summary.defender_losses, DefenseCode.HOLO_DECOY), 50)
  })

  it('leaves battles without decoys unchanged', () => {
    const result = round({
      attacker_stacks,
      defender_stacks: walls,
    })

    assert.equal(result.round_summary.decoy_absorbed, 0)
    assert.equal(lossOf(result.round_summary.defender_losses, DefenseCode.RAMPART), 10)
  })

  it('accumulates over a full battle: absorbed in rounds 1–2, all consumed by the end', () => {
    const result = CombatService.simulateBattle({
      attacker_stacks,
      defender_stacks: [
        defense(DefenseCode.HOLO_DECOY, 100),
        ...walls,
        defense(DefenseCode.TURRET, 40),
      ],
      attacker_strategy: CombatStrategy.BALANCED,
      defender_strategy: CombatStrategy.BALANCED,
    })

    const absorbed = result.round_summaries.map(summary => summary.decoy_absorbed ?? 0)
    assert.ok(absorbed[0] > 0 && absorbed[1] > 0)
    assert.ok(absorbed.slice(2).every(count => count === 0))
    assert.equal(countOf(result.final_defender_stacks, DefenseCode.HOLO_DECOY), 0)
    const consumed = result.round_summaries
      .reduce((sum, summary) => sum + lossOf(summary.defender_losses, DefenseCode.HOLO_DECOY), 0)
    assert.equal(consumed, 100)
  })
})

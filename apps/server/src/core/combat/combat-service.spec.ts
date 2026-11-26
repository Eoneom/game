import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import { CombatService, resolveBattleWinner } from '#core/combat/combat-service'
import { EXPOSURE_LIFE_MULT } from '#core/combat/constant/exposure'
import { CombatStrategyService } from '#core/combat/strategy-service'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { CombatTroopClass } from '#core/combat/value/combat-troop-class'
import { BattleWinner } from '#core/combat/value/battle-winner'
import { TroopCode } from '#core/troop/constant/code'

describe('CombatService', () => {
  it('applies exposure multiplier to homogeneous combat life pool', () => {
    const result = CombatService.advanceRound({
      round: 1,
      attacker_stacks: [{ code: TroopCode.LEGIONNAIRE, count: 10 }],
      defender_stacks: [{ code: TroopCode.LEGIONNAIRE, count: 10 }],
      attacker_strategy: CombatStrategy.BALANCED,
      defender_strategy: CombatStrategy.BALANCED,
    })
    assert.ok(result.round_summary.defender_life_pool < 10 * 15)
    assert.ok(
      Math.abs(result.round_summary.defender_life_pool - Math.floor(10 * 15 * EXPOSURE_LIFE_MULT)) <= 1
    )
  })

  it('ends early when defender loses all combat', () => {
    const result = CombatService.advanceRound({
      round: 1,
      attacker_stacks: [{ code: TroopCode.INTERCEPTOR, count: 50 }],
      defender_stacks: [{ code: TroopCode.DISRUPTOR, count: 1 }],
      attacker_strategy: CombatStrategy.OPENING_STRIKE,
      defender_strategy: CombatStrategy.BALANCED,
    })
    assert.equal(result.winner, BattleWinner.ATTACKER)
  })

  it('simulateBattle runs rounds until winner or max round', () => {
    const result = CombatService.simulateBattle({
      attacker_stacks: [{ code: TroopCode.INTERCEPTOR, count: 50 }],
      defender_stacks: [{ code: TroopCode.DISRUPTOR, count: 1 }],
      attacker_strategy: CombatStrategy.OPENING_STRIKE,
      defender_strategy: CombatStrategy.BALANCED,
    })
    assert.equal(result.winner, BattleWinner.ATTACKER)
    assert.ok(result.round_summaries.length >= 1)
    assert.equal(result.round_summaries[0].round, 1)
    assert.ok(result.final_defender_stacks.every(s => s.count === 0) || result.final_defender_stacks.length === 0)
  })

  it('continues to round 5 stalemate when both retain combat', () => {
    const winner = resolveBattleWinner({
      attacker_stacks: [{ code: TroopCode.LEGIONNAIRE, count: 1 }],
      defender_stacks: [{ code: TroopCode.WAR_MACHINE, count: 1 }],
      round: 5,
      max_round: 5,
    })
    assert.equal(winner, BattleWinner.DRAW)
  })

  describe('technology modifiers', () => {
    const attacker_stacks = [
      {
        code: TroopCode.LEGIONNAIRE,
        count: 40
      },
      {
        code: TroopCode.INTERCEPTOR,
        count: 20
      },
    ]
    const defender_stacks = [
      {
        code: TroopCode.WAR_MACHINE,
        count: 30
      },
      {
        code: TroopCode.DISRUPTOR,
        count: 30
      },
    ]

    function round(modifiers: {
      attacker_modifiers?: { attack: number; life: number }
      defender_modifiers?: { attack: number; life: number }
    }) {
      return CombatService.advanceRound({
        round: 1,
        attacker_stacks,
        defender_stacks,
        attacker_strategy: CombatStrategy.BALANCED,
        defender_strategy: CombatStrategy.BALANCED,
        ...modifiers,
      })
    }

    it('scales combat attack and life pools', () => {
      const neutral = round({})
      const boosted = round({
        attacker_modifiers: {
          attack: 1.09,
          life: 1.06
        }
      })

      assert.ok(Math.abs(boosted.round_summary.attacker_attack_pool - neutral.round_summary.attacker_attack_pool * 1.09) < 1e-6)
      assert.ok(Math.abs(boosted.round_summary.attacker_life_pool - neutral.round_summary.attacker_life_pool * 1.06) < 1e-6)
      assert.equal(boosted.round_summary.defender_attack_pool, neutral.round_summary.defender_attack_pool)
      assert.equal(boosted.round_summary.defender_life_pool, neutral.round_summary.defender_life_pool)
    })

    it('does not boost non-combat stacks', () => {
      // Two combat classes: no exposure rounding in the life pool.
      const stacks = [
        {
          code: TroopCode.LEGIONNAIRE,
          count: 10
        },
        {
          code: TroopCode.INTERCEPTOR,
          count: 10
        },
        {
          code: TroopCode.LIGHT_TRANSPORTER,
          count: 10
        },
      ]
      const args = {
        round: 1,
        attacker_stacks: stacks,
        defender_stacks,
        attacker_strategy: CombatStrategy.BALANCED,
        defender_strategy: CombatStrategy.BALANCED,
      }
      const combat_only_neutral = CombatService.advanceRound({
        ...args,
        attacker_stacks: stacks.slice(0, 2)
      })
      const combat_only_boosted = CombatService.advanceRound({
        ...args,
        attacker_stacks: stacks.slice(0, 2),
        attacker_modifiers: {
          attack: 1,
          life: 1.5
        },
      })
      const neutral = CombatService.advanceRound(args)
      const boosted = CombatService.advanceRound({
        ...args,
        attacker_modifiers: {
          attack: 1,
          life: 1.5
        }
      })

      const combat_gain = combat_only_boosted.round_summary.attacker_life_pool
        - combat_only_neutral.round_summary.attacker_life_pool
      assert.ok(Math.abs(boosted.round_summary.attacker_life_pool - neutral.round_summary.attacker_life_pool - combat_gain) < 1e-6)
    })

    it('higher life modifier reduces whole-unit casualties', () => {
      const args = {
        round: 1,
        attacker_stacks: [
          {
            code: TroopCode.LEGIONNAIRE,
            count: 100
          }
        ],
        defender_stacks: [
          {
            code: TroopCode.INTERCEPTOR,
            count: 1000
          }
        ],
        attacker_strategy: CombatStrategy.BALANCED,
        defender_strategy: CombatStrategy.BALANCED,
      }
      const neutral = CombatService.advanceRound(args)
      const plated = CombatService.advanceRound({
        ...args,
        attacker_modifiers: {
          attack: 1,
          life: 1.6
        }
      })

      const count = (lines: { count: number }[]) => lines.reduce((sum, line) => sum + line.count, 0)
      assert.ok(count(plated.round_summary.attacker_losses) < count(neutral.round_summary.attacker_losses))
    })

    it('applies exposure after modifiers', () => {
      const homogeneous = CombatService.advanceRound({
        round: 1,
        attacker_stacks: [
          {
            code: TroopCode.LEGIONNAIRE,
            count: 10
          }
        ],
        defender_stacks: [
          {
            code: TroopCode.LEGIONNAIRE,
            count: 10
          }
        ],
        attacker_strategy: CombatStrategy.BALANCED,
        defender_strategy: CombatStrategy.BALANCED,
        defender_modifiers: {
          attack: 1,
          life: 1.2
        },
      })
      const unexposed_life = 10 * 15 * CombatStrategyService.getMultipliers({
        strategy: CombatStrategy.BALANCED,
        round: 1,
        troop_class: CombatTroopClass.LEGIONNAIRE,
      }).life * 1.2
      assert.equal(homogeneous.round_summary.defender_life_pool, Math.floor(unexposed_life * EXPOSURE_LIFE_MULT))
    })

    it('simulateBattle forwards modifiers and defaults to neutral', () => {
      const neutral = CombatService.simulateBattle({
        attacker_stacks,
        defender_stacks,
        attacker_strategy: CombatStrategy.BALANCED,
        defender_strategy: CombatStrategy.BALANCED,
      })
      const explicit_neutral = CombatService.simulateBattle({
        attacker_stacks,
        defender_stacks,
        attacker_strategy: CombatStrategy.BALANCED,
        defender_strategy: CombatStrategy.BALANCED,
        attacker_modifiers: {
          attack: 1,
          life: 1
        },
        defender_modifiers: {
          attack: 1,
          life: 1
        },
      })
      const boosted = CombatService.simulateBattle({
        attacker_stacks,
        defender_stacks,
        attacker_strategy: CombatStrategy.BALANCED,
        defender_strategy: CombatStrategy.BALANCED,
        attacker_modifiers: {
          attack: 1.3,
          life: 1.3
        },
      })
      assert.deepStrictEqual(neutral, explicit_neutral)
      assert.ok(boosted.round_summaries[0].attacker_attack_pool > neutral.round_summaries[0].attacker_attack_pool)
    })
  })
})

import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import { CombatService, resolveBattleWinner } from '#core/combat/combat-service'
import { EXPOSURE_LIFE_MULT } from '#core/combat/constant/exposure'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
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

  it('continues to round 5 stalemate when both retain combat', () => {
    const winner = resolveBattleWinner({
      attacker_stacks: [{ code: TroopCode.LEGIONNAIRE, count: 1 }],
      defender_stacks: [{ code: TroopCode.WAR_MACHINE, count: 1 }],
      round: 5,
      max_round: 5,
    })
    assert.equal(winner, BattleWinner.DRAW)
  })
})

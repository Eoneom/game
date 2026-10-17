import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import { CombatStrategyService } from '#core/combat/strategy-service'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { CombatTroopClass } from '#core/combat/value/combat-troop-class'

describe('CombatStrategyService', () => {
  it('returns balanced multipliers for all classes', () => {
    const mult = CombatStrategyService.getMultipliers({
      strategy: CombatStrategy.BALANCED,
      round: 3,
      troop_class: CombatTroopClass.INTERCEPTOR,
    })
    assert.equal(mult.attack, 1)
    assert.equal(mult.life, 1)
  })

  it('returns opening_strike round 1 spike for interceptor', () => {
    const mult = CombatStrategyService.getMultipliers({
      strategy: CombatStrategy.OPENING_STRIKE,
      round: 1,
      troop_class: CombatTroopClass.INTERCEPTOR,
    })
    assert.equal(mult.attack, 1.32)
    assert.equal(mult.life, 0.78)
  })
})

import { CombatService } from '#core/combat/combat-service'
import { BattleStack } from '#core/combat/type/battle-stack'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { TroopCode } from '#core/troop/constant/code'

describe('CombatService with defender reinforcements (slice 033)', () => {
  const attacker_stacks: BattleStack[] = [
    {
      code: TroopCode.LEGIONNAIRE,
      count: 40 
    } 
  ]
  const host_and_ally: BattleStack[] = [
    {
      code: TroopCode.LEGIONNAIRE,
      count: 10 
    },
    {
      code: TroopCode.LEGIONNAIRE,
      count: 10,
      player_id: 'ally' 
    },
  ]

  const round = (defender_owner_modifiers?: Record<string, { attack: number, life: number }>) => CombatService.advanceRound({
    round: 1,
    attacker_stacks,
    defender_stacks: host_and_ally,
    attacker_strategy: CombatStrategy.BALANCED,
    defender_strategy: CombatStrategy.BALANCED,
    defender_modifiers: {
      attack: 1,
      life: 1,
      fortification: 1.5 
    },
    defender_owner_modifiers,
  })

  it('pools host and reinforcement stacks on the defender side', () => {
    const alone = CombatService.advanceRound({
      round: 1,
      attacker_stacks,
      defender_stacks: [
        {
          code: TroopCode.LEGIONNAIRE,
          count: 10 
        } 
      ],
      attacker_strategy: CombatStrategy.BALANCED,
      defender_strategy: CombatStrategy.BALANCED,
    })
    const together = round()

    expect(together.round_summary.defender_attack_pool).toBe(alone.round_summary.defender_attack_pool * 2)
    // Exposure floors the pooled life once instead of per stack.
    expect(Math.abs(together.round_summary.defender_life_pool - alone.round_summary.defender_life_pool * 2)).toBeLessThanOrEqual(1)
  })

  it('applies each owner Arsenal modifiers to their own stacks only', () => {
    const neutral = round()
    const boosted = round({
      ally: {
        attack: 2,
        life: 1 
      } 
    })

    // Only the ally's half of the pool doubles.
    expect(boosted.round_summary.defender_attack_pool).toBe(neutral.round_summary.defender_attack_pool * 1.5)
  })

  it('records losses per stack owner', () => {
    const result = round()
    const lines = result.round_summary.defender_losses

    expect(lines.length).toBeGreaterThan(0)
    for (const line of lines) {
      expect(line.code).toBe(TroopCode.LEGIONNAIRE)
    }
    const merged = CombatService.mergeCumulativeLosses([
      {
        code: TroopCode.LEGIONNAIRE,
        count: 1 
      },
      {
        code: TroopCode.LEGIONNAIRE,
        count: 2,
        player_id: 'ally' 
      },
    ], [
      {
        code: TroopCode.LEGIONNAIRE,
        count: 3 
      },
      {
        code: TroopCode.LEGIONNAIRE,
        count: 4,
        player_id: 'ally' 
      },
    ])
    expect(merged).toEqual([
      {
        code: TroopCode.LEGIONNAIRE,
        count: 4 
      },
      {
        code: TroopCode.LEGIONNAIRE,
        count: 6,
        player_id: 'ally' 
      },
    ])
    // Surviving stacks keep their owner.
    expect(result.defender_stacks.some(stack => 'player_id' in stack && stack.player_id === 'ally')).toBe(true)
  })

  it('keeps battles without reinforcements unchanged (no player_id on lines)', () => {
    const result = CombatService.advanceRound({
      round: 1,
      attacker_stacks,
      defender_stacks: [
        {
          code: TroopCode.LEGIONNAIRE,
          count: 10 
        } 
      ],
      attacker_strategy: CombatStrategy.BALANCED,
      defender_strategy: CombatStrategy.BALANCED,
    })
    for (const line of result.round_summary.defender_losses) {
      expect('player_id' in line).toBe(false)
    }
  })
})

import { CombatService } from '#core/combat/combat-service'
import { BattleRoundSummary, BattleStack } from '#core/combat/type/battle-stack'
import { BattleWinner } from '#core/combat/value/battle-winner'
import { CombatStrategy } from '#core/combat/value/combat-strategy'

export type SimulateCombatParams = {
  attacker_stacks: BattleStack[]
  defender_stacks: BattleStack[]
  attacker_strategy: CombatStrategy
  defender_strategy: CombatStrategy
}

export type SimulateCombatResult = {
  winner: BattleWinner | null
  round_summaries: BattleRoundSummary[]
  final_attacker_stacks: BattleStack[]
  final_defender_stacks: BattleStack[]
}

export function simulateCombat(params: SimulateCombatParams): SimulateCombatResult {
  return CombatService.simulateBattle(params)
}

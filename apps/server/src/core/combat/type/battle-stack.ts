import { TroopCode } from '#core/troop/constant/code'

export type BattleStack = {
  code: TroopCode
  count: number
}

export type BattleCasualtyLine = {
  code: TroopCode
  count: number
}

export type BattleRoundSummary = {
  round: number
  attacker_attack_pool: number
  defender_attack_pool: number
  attacker_life_pool: number
  defender_life_pool: number
  attacker_losses: BattleCasualtyLine[]
  defender_losses: BattleCasualtyLine[]
}

export type BattleStateJson = {
  attacker_stacks: BattleStack[]
  defender_stacks: BattleStack[]
  attacker_origin: { x: number; y: number }
  round_summaries: BattleRoundSummary[]
  cumulative_attacker_losses: BattleCasualtyLine[]
  cumulative_defender_losses: BattleCasualtyLine[]
}

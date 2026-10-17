import { BattleCasualtyLine, BattleRoundSummary } from '#core/combat/type/battle-stack'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { BattleWinner } from '#core/combat/value/battle-winner'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { ReportPerspective } from '#core/combat/value/report-perspective'
import { FactionCode } from '#core/faction/constant/code'

export type ReportBattleOutcome = {
  occupied: boolean
  destroyed_temp_outpost: boolean
  loot_applied: boolean
  attacker_retreated: boolean
}

export type ReportBattleMetadata = {
  battle_id: string
  movement_id: string
  perspective: ReportPerspective
  attacker_player_id: string
  defender_player_id: string
  attacker_faction_code: FactionCode
  defender_faction_code: FactionCode
  target_kind: BattleTargetKind
  target_id?: string | null
  winner: BattleWinner
  attacker_strategy: CombatStrategy
  defender_strategy: CombatStrategy
  rounds_played: number
  outcome: ReportBattleOutcome
  casualties_attacker: BattleCasualtyLine[]
  casualties_defender: BattleCasualtyLine[]
  round_summaries: BattleRoundSummary[]
}

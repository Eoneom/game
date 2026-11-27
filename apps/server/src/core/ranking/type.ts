import { BuildingCode } from '#core/building/constant/code'
import { DefenseCode } from '#core/defense/constant/code'
import { FactionCode } from '#core/faction/constant/code'
import { RankingCategory } from '#core/ranking/value/category'
import { RankingKind } from '#core/ranking/value/kind'
import { TechnologyCode } from '#core/technology/constant/code'
import { TroopCode } from '#core/troop/constant/code'

/** Everything a human player still owns that counts toward the global and economy scores. */
export type RankingPlayerAssets = {
  buildings: { code: BuildingCode, level: number }[]
  technologies: { code: TechnologyCode, level: number }[]
  troops: { code: TroopCode, count: number }[]
  defenses: { code: DefenseCode, count: number }[]
  /** Cumulative value of enemy troops and defenses destroyed (`player.military_value`). */
  military_value: number
}

export type RankingScores = Record<RankingCategory, number>

/** One ranked row of a snapshot. `position` is the display order (rank, then name). */
export type RankingEntry = {
  category: RankingCategory
  kind: RankingKind
  entity_id: string
  rank: number
  position: number
  points: number
}

export type RankingSnapshot = {
  id: string
  computed_at: number
}

/** A human player as loaded by the ranking job. */
export type RankingPlayer = {
  id: string
  name: string
  faction_code: FactionCode
  alliance_id: string | null
}

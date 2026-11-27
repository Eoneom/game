import { BuildingCode } from '#core/building/constant/code'
import { DefenseCode } from '#core/defense/constant/code'
import { FactionCode } from '#core/faction/constant/code'
import {
  RankingEntry,
  RankingPlayer,
  RankingSnapshot
} from '#core/ranking/type'
import { RankingCategory } from '#core/ranking/value/category'
import { RankingKind } from '#core/ranking/value/kind'
import { TechnologyCode } from '#core/technology/constant/code'
import { TroopCode } from '#core/troop/constant/code'

export type RankingHumanPlayer = RankingPlayer & { military_value: number }

export type RankingAllianceSummary = {
  id: string
  name: string
  tag: string
  member_count: number
}

/**
 * Batched loading for the ranking job and snapshot storage (slice 034).
 * Every `listHuman*` call reads all human players at once (one query, never one per player).
 */
export type RankingRepository = {
  listHumanPlayers(): Promise<RankingHumanPlayer[]>
  /** Finished building levels of every city owned by a human player. */
  listHumanBuildingLevels(): Promise<{ player_id: string, code: BuildingCode, level: number }[]>
  listHumanTechnologyLevels(): Promise<{ player_id: string, code: TechnologyCode, level: number }[]>
  /** Troops summed per owner and code, wherever they are: stationed, in movement, reinforcing an ally. */
  listHumanTroopCounts(): Promise<{ player_id: string, code: TroopCode, count: number }[]>
  /** Built defenses summed per city owner and code. */
  listHumanDefenseCounts(): Promise<{ player_id: string, code: DefenseCode, count: number }[]>
  listAlliances(): Promise<{ id: string, name: string }[]>

  /** Display data of ranked alliances (current name, tag and member count). */
  listAllianceSummaries(alliance_ids: string[]): Promise<RankingAllianceSummary[]>
  /** Current number of human players per faction. */
  countHumanPlayersByFaction(): Promise<{ faction_code: FactionCode, count: number }[]>

  /** Inserts the snapshot and its entries; callers run it inside the job transaction. */
  createSnapshot(args: { computed_at: number, entries: RankingEntry[] }): Promise<RankingSnapshot>
  /** Deletes snapshots computed before `before` (entries cascade); returns how many were deleted. */
  deleteSnapshotsBefore(before: number): Promise<number>
  findLatestSnapshot(): Promise<RankingSnapshot | null>
  /** Snapshot computed before `before` whose `computed_at` is closest to `target`. */
  findSnapshotClosestTo(args: { target: number, before: number }): Promise<RankingSnapshot | null>
  /** Entries in display order (rank, then position). */
  listEntries(args: {
    snapshot_id: string
    category: RankingCategory
    kind: RankingKind
    offset: number
    limit: number
  }): Promise<RankingEntry[]>
  countEntries(args: { snapshot_id: string, category: RankingCategory, kind: RankingKind }): Promise<number>
  /** Entries of the given entities in one snapshot, every category unless `category` is set. */
  listEntriesForEntities(args: {
    snapshot_id: string
    kind: RankingKind
    entity_ids: string[]
    category?: RankingCategory
  }): Promise<RankingEntry[]>
}

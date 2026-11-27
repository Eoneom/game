import { FactionCode } from '@server-core/faction/constant/code'
import { RankingCategory } from '@server-core/ranking/value/category'
import { RankingKind } from '@server-core/ranking/value/kind'
import { GenericResponse } from '../../response'

export interface RankingListRequest {
  category: RankingCategory
  kind: RankingKind
  page?: number
}

export interface RankingPlayerRowEntity {
  kind: RankingKind.PLAYER
  id: string
  name: string
  faction_code: FactionCode
  alliance_tag: string | null
}

export interface RankingAllianceRowEntity {
  kind: RankingKind.ALLIANCE
  id: string
  /** `null` when the alliance was dissolved after the snapshot. */
  name: string | null
  tag: string | null
  member_count: number
}

export interface RankingFactionRowEntity {
  kind: RankingKind.FACTION
  code: FactionCode
  player_count: number
}

export type RankingRowEntity = RankingPlayerRowEntity | RankingAllianceRowEntity | RankingFactionRowEntity

export interface RankingRow {
  rank: number
  /** Previous rank − current rank against the snapshot closest to 24 h earlier (positive = moved up). */
  rank_change_24h: number | null
  points: number
  entity: RankingRowEntity
}

export interface RankingListDataResponse {
  /** `null` before the first snapshot (then `rows` is empty). */
  computed_at: number | null
  category: RankingCategory
  kind: RankingKind
  page: number
  page_size: number
  total: number
  rows: RankingRow[]
}

export type RankingListResponse = GenericResponse<RankingListDataResponse>

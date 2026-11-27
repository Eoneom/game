import { RankingCategory } from '@server-core/ranking/value/category'
import { RankingKind } from '@server-core/ranking/value/kind'
import { GenericResponse } from '../../response'

export interface RankingMePosition {
  category: RankingCategory
  kind: RankingKind
  /** Player id, alliance id or faction code. */
  entity_id: string
  rank: number
  rank_change_24h: number | null
  points: number
  /** Page of `GET /ranking` where the entry appears. */
  page: number
}

export interface RankingMeDataResponse {
  /** `null` before the first snapshot (then `positions` is empty). */
  computed_at: number | null
  /** The caller's entries per category, then their alliance's (when ranked) and their faction's. */
  positions: RankingMePosition[]
}

export type RankingMeResponse = GenericResponse<RankingMeDataResponse>

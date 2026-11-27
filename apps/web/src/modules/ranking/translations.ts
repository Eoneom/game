import { RankingCategory, RankingKind } from '@eoneom/api-client'

/** Alliances are ranked from 3 members (slice 034). */
export const RANKING_ALLIANCE_MIN_MEMBERS = 3

export const RankingCategoryLabels: Record<RankingCategory, string> = {
  [RankingCategory.GLOBAL]: 'Général',
  [RankingCategory.ECONOMY]: 'Économie',
  [RankingCategory.MILITARY]: 'Militaire',
}

export const RankingKindLabels: Record<RankingKind, string> = {
  [RankingKind.PLAYER]: 'Joueurs',
  [RankingKind.ALLIANCE]: 'Alliances',
  [RankingKind.FACTION]: 'Factions',
}

/** `▲3` (moved up), `▼2` (moved down), `=` (unchanged), empty without an earlier snapshot. */
export const formatRankChange = (change: number | null): string => {
  if (change === null) return ''
  if (change > 0) return `▲${change}`
  if (change < 0) return `▼${-change}`
  return '='
}

/** Footer time of the snapshot: `Mis à jour à HH:MM`. */
export const formatComputedAt = (computedAt: number): string => {
  const date = new Date(computedAt)
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `Mis à jour à ${hh}:${mm}`
}

export const formatPoints = (points: number): string => points.toLocaleString('fr-FR')

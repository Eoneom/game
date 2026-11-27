/** What a ranking entry ranks (slice 034). Faction entries use the faction code as `entity_id`. */
export enum RankingKind {
  PLAYER = 'player',
  ALLIANCE = 'alliance',
  FACTION = 'faction',
}

export const isRankingKind = (value: unknown): value is RankingKind => {
  return Object.values(RankingKind).includes(value as RankingKind)
}

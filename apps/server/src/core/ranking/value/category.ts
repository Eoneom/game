/** Ranking categories (slice 034): Général, Économie, Militaire. */
export enum RankingCategory {
  GLOBAL = 'global',
  ECONOMY = 'economy',
  MILITARY = 'military',
}

export const isRankingCategory = (value: unknown): value is RankingCategory => {
  return Object.values(RankingCategory).includes(value as RankingCategory)
}

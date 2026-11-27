import { useQuery } from '@tanstack/react-query'
import type { RankingCategory, RankingKind } from '@eoneom/api-client'

import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { useAuth } from '#auth/context'

const rankingKeys = {
  all: ['ranking'] as const,
  list: (category: RankingCategory, kind: RankingKind, page: number) => ['ranking', 'list', category, kind, page] as const,
  me: ['ranking', 'me'] as const,
}

/** Snapshots are hourly: no need to refetch more often than every minute. */
const RANKING_STALE_TIME_MS = 60_000

/** One page of the latest snapshot (slice 034). */
export const useRankingList = (category: RankingCategory, kind: RankingKind, page: number) => {
  const { token } = useAuth()

  return useQuery({
    queryKey: rankingKeys.list(category, kind, page),
    queryFn: async () => {
      if (!token) throw new Error('empty token')
      const res = await client.ranking.list(token, { category, kind, page })
      if (isError(res)) throw new Error(res.error_code)
      if (!res.data) throw new Error('no data')
      return res.data
    },
    enabled: !!token,
    staleTime: RANKING_STALE_TIME_MS,
  })
}

/** The caller's player, alliance and faction positions in the latest snapshot. */
export const useRankingMe = () => {
  const { token } = useAuth()

  return useQuery({
    queryKey: rankingKeys.me,
    queryFn: async () => {
      if (!token) throw new Error('empty token')
      const res = await client.ranking.me(token)
      if (isError(res)) throw new Error(res.error_code)
      if (!res.data) throw new Error('no data')
      return res.data
    },
    enabled: !!token,
    staleTime: RANKING_STALE_TIME_MS,
  })
}

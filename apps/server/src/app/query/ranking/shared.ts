import { Repository } from '#app/port/repository/generic'
import {
  RANKING_CHANGE_REFERENCE_MS,
  RANKING_PAGE_SIZE
} from '#core/ranking/constant/limits'
import {
  RankingEntry,
  RankingSnapshot
} from '#core/ranking/type'
import { RankingKind } from '#core/ranking/value/kind'

/** Page (1-based, 50 rows) where an entry appears. */
export const rankingPageOf = (position: number): number => Math.max(1, Math.ceil(position / RANKING_PAGE_SIZE))

const changeKey = (entry: Pick<RankingEntry, 'category' | 'entity_id'>): string => `${entry.category}:${entry.entity_id}`

/**
 * Rank change of `entries` (all of one `kind`) against the snapshot closest to 24 h before `latest`:
 * `previous rank − current rank` (positive = moved up). Missing when there is no earlier snapshot
 * or the entity was not ranked in it.
 */
export async function loadRankChanges({
  repository,
  latest,
  kind,
  entries,
}: {
  repository: Repository
  latest: RankingSnapshot
  kind: RankingKind
  entries: RankingEntry[]
}): Promise<(entry: RankingEntry) => number | null> {
  if (entries.length === 0) {
    return () => null
  }
  const reference = await repository.ranking.findSnapshotClosestTo({
    target: latest.computed_at - RANKING_CHANGE_REFERENCE_MS,
    before: latest.computed_at,
  })
  if (!reference) {
    return () => null
  }
  const categories = new Set(entries.map(entry => entry.category))
  const previous = await repository.ranking.listEntriesForEntities({
    snapshot_id: reference.id,
    kind,
    entity_ids: [ ...new Set(entries.map(entry => entry.entity_id)) ],
    ...(categories.size === 1 ? { category: entries[0].category } : {}),
  })
  const previous_ranks = new Map(previous.map(entry => [
    changeKey(entry),
    entry.rank 
  ]))

  return (entry: RankingEntry) => {
    const previous_rank = previous_ranks.get(changeKey(entry))
    return previous_rank === undefined ? null : previous_rank - entry.rank
  }
}

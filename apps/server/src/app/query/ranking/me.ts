import { GenericQuery } from '#query/generic'
import {
  loadRankChanges,
  rankingPageOf
} from '#query/ranking/shared'
import { RankingCategory } from '#core/ranking/value/category'
import { RankingKind } from '#core/ranking/value/kind'

interface RankingMeQueryRequest {
  player_id: string
}

type RankingMePosition = {
  category: RankingCategory
  kind: RankingKind
  entity_id: string
  rank: number
  rank_change_24h: number | null
  points: number
  /** Page of `GET /ranking` where the entry appears. */
  page: number
}

interface RankingMeQueryResponse {
  computed_at: number | null
  /** The caller's player entries, plus their alliance (when ranked) and faction entries, in the latest snapshot. */
  positions: RankingMePosition[]
}

const KIND_ORDER = Object.values(RankingKind)
const CATEGORY_ORDER = Object.values(RankingCategory)

/** The caller's ranks and points in each category, with their alliance and faction ranks (slice 034). */
export class RankingMeQuery extends GenericQuery<RankingMeQueryRequest, RankingMeQueryResponse> {
  constructor() {
    super({ name: 'ranking:me' })
  }

  protected async get({ player_id }: RankingMeQueryRequest): Promise<RankingMeQueryResponse> {
    const latest = await this.repository.ranking.findLatestSnapshot()
    if (!latest) {
      return {
        computed_at: null,
        positions: [],
      }
    }

    const [
      player,
      membership 
    ] = await Promise.all([
      this.repository.player.get(player_id),
      this.repository.alliance.findMembership(player_id),
    ])
    const targets: { kind: RankingKind, entity_id: string }[] = [
      {
        kind: RankingKind.PLAYER,
        entity_id: player.id
      },
      ...(membership ? [
        {
          kind: RankingKind.ALLIANCE,
          entity_id: membership.alliance_id
        } 
      ] : []),
      {
        kind: RankingKind.FACTION,
        entity_id: player.faction_code
      },
    ]

    const per_kind = await Promise.all(targets.map(async ({
      kind, entity_id
    }) => {
      const entries = await this.repository.ranking.listEntriesForEntities({
        snapshot_id: latest.id,
        kind,
        entity_ids: [ entity_id ],
      })
      const changeOf = await loadRankChanges({
        repository: this.repository,
        latest,
        kind,
        entries,
      })
      return entries.map(entry => ({
        category: entry.category,
        kind: entry.kind,
        entity_id: entry.entity_id,
        rank: entry.rank,
        rank_change_24h: changeOf(entry),
        points: entry.points,
        page: rankingPageOf(entry.position),
      }))
    }))

    return {
      computed_at: latest.computed_at,
      positions: per_kind.flat().sort((a, b) => {
        return KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)
          || CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
      }),
    }
  }
}

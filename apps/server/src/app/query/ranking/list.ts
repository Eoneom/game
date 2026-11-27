import { GenericQuery } from '#query/generic'
import { loadRankChanges } from '#query/ranking/shared'
import { FactionCode } from '#core/faction/constant/code'
import { RANKING_PAGE_SIZE } from '#core/ranking/constant/limits'
import { RankingEntry } from '#core/ranking/type'
import { RankingCategory } from '#core/ranking/value/category'
import { RankingKind } from '#core/ranking/value/kind'

interface RankingListQueryRequest {
  category: RankingCategory
  kind: RankingKind
  page: number
}

type RankingRowEntity =
  | { kind: RankingKind.PLAYER, id: string, name: string, faction_code: FactionCode, alliance_tag: string | null }
  /** `name` / `tag` are `null` when the alliance was dissolved after the snapshot. */
  | { kind: RankingKind.ALLIANCE, id: string, name: string | null, tag: string | null, member_count: number }
  | { kind: RankingKind.FACTION, code: FactionCode, player_count: number }

type RankingRow = {
  rank: number
  rank_change_24h: number | null
  points: number
  entity: RankingRowEntity
}

interface RankingListQueryResponse {
  computed_at: number | null
  page: number
  total: number
  rows: RankingRow[]
}

const normalizePage = (page: number): number => Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1

/** One page (50 rows) of the latest snapshot (slice 034); entity names, tags and counts are current. */
export class RankingListQuery extends GenericQuery<RankingListQueryRequest, RankingListQueryResponse> {
  constructor() {
    super({ name: 'ranking:list' })
  }

  protected async get({
    category,
    kind,
    page
  }: RankingListQueryRequest): Promise<RankingListQueryResponse> {
    const current_page = normalizePage(page)
    const latest = await this.repository.ranking.findLatestSnapshot()
    if (!latest) {
      return {
        computed_at: null,
        page: current_page,
        total: 0,
        rows: [],
      }
    }

    const [
      entries,
      total 
    ] = await Promise.all([
      this.repository.ranking.listEntries({
        snapshot_id: latest.id,
        category,
        kind,
        offset: (current_page - 1) * RANKING_PAGE_SIZE,
        limit: RANKING_PAGE_SIZE,
      }),
      this.repository.ranking.countEntries({
        snapshot_id: latest.id,
        category,
        kind,
      }),
    ])

    const [
      changeOf,
      entityOf 
    ] = await Promise.all([
      loadRankChanges({
        repository: this.repository,
        latest,
        kind,
        entries,
      }),
      this.loadEntities(kind, entries),
    ])

    return {
      computed_at: latest.computed_at,
      page: current_page,
      total,
      rows: entries.map(entry => ({
        rank: entry.rank,
        rank_change_24h: changeOf(entry),
        points: entry.points,
        entity: entityOf(entry.entity_id),
      })),
    }
  }

  private async loadEntities(kind: RankingKind, entries: RankingEntry[]): Promise<(entity_id: string) => RankingRowEntity> {
    const ids = entries.map(entry => entry.entity_id)

    if (kind === RankingKind.PLAYER) {
      const [
        players,
        tags 
      ] = await Promise.all([
        this.repository.player.listByIds(ids),
        this.repository.alliance.listTagsByPlayerIds(ids),
      ])
      const players_by_id = new Map(players.map(player => [
        player.id,
        player 
      ]))
      const tags_by_player = new Map(tags.map(tag => [
        tag.player_id,
        tag.tag 
      ]))
      return (entity_id) => {
        const player = players_by_id.get(entity_id)
        return {
          kind: RankingKind.PLAYER,
          id: entity_id,
          name: player?.name ?? '',
          faction_code: player?.faction_code ?? FactionCode.THE_CONFEDERATION,
          alliance_tag: tags_by_player.get(entity_id) ?? null,
        }
      }
    }

    if (kind === RankingKind.ALLIANCE) {
      const summaries = await this.repository.ranking.listAllianceSummaries(ids)
      const by_id = new Map(summaries.map(summary => [
        summary.id,
        summary 
      ]))
      return (entity_id) => {
        const summary = by_id.get(entity_id)
        return {
          kind: RankingKind.ALLIANCE,
          id: entity_id,
          name: summary?.name ?? null,
          tag: summary?.tag ?? null,
          member_count: summary?.member_count ?? 0,
        }
      }
    }

    const counts = entries.length > 0 ? await this.repository.ranking.countHumanPlayersByFaction() : []
    const count_by_faction = new Map(counts.map(count => [
      count.faction_code,
      count.count 
    ]))
    return (entity_id) => ({
      kind: RankingKind.FACTION,
      code: entity_id as FactionCode,
      player_count: count_by_faction.get(entity_id as FactionCode) ?? 0,
    })
  }
}

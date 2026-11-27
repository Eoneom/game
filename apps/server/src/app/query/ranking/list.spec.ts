import type { MockInstance } from 'vitest'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { RankingListQuery } from '#query/ranking/list'
import { RankingMeQuery } from '#query/ranking/me'
import { FactionCode } from '#core/faction/constant/code'
import { PlayerEntity } from '#core/player/entity'
import {
  RANKING_CHANGE_REFERENCE_MS,
  RANKING_PAGE_SIZE
} from '#core/ranking/constant/limits'
import { RankingEntry } from '#core/ranking/type'
import { RankingCategory } from '#core/ranking/value/category'
import { RankingKind } from '#core/ranking/value/kind'

const latest = {
  id: 'latest',
  computed_at: 10 * 24 * 60 * 60 * 1000
}
const reference = {
  id: 'reference',
  computed_at: latest.computed_at - RANKING_CHANGE_REFERENCE_MS - 5 * 60 * 1000
}

const entry = (overrides: Partial<RankingEntry> & Pick<RankingEntry, 'entity_id' | 'rank' | 'position'>): RankingEntry => ({
  category: RankingCategory.GLOBAL,
  kind: RankingKind.PLAYER,
  points: 100,
  ...overrides,
})

describe('ranking queries (slice 034)', () => {
  let ranking: Record<string, MockInstance>

  function setup({
    has_snapshot = true,
    has_reference = true,
  }: {
    has_snapshot?: boolean
    has_reference?: boolean
  } = {}): void {
    ranking = {
      findLatestSnapshot: vi.fn().mockResolvedValue(has_snapshot ? latest : null),
      findSnapshotClosestTo: vi.fn().mockResolvedValue(has_reference ? reference : null),
      listEntries: vi.fn().mockResolvedValue([
        entry({
          entity_id: 'p-a',
          rank: 51,
          position: 51
        }),
        entry({
          entity_id: 'p-b',
          rank: 51,
          position: 52
        }),
      ]),
      countEntries: vi.fn().mockResolvedValue(120),
      listEntriesForEntities: vi.fn(async ({
        snapshot_id, kind, entity_ids
      }: { snapshot_id: string, kind: RankingKind, entity_ids: string[] }) => {
        if (snapshot_id === reference.id) {
          // p-a was 60th a day ago, p-b was not ranked.
          return entity_ids.includes('p-a') && kind === RankingKind.PLAYER
            ? [
              entry({
                entity_id: 'p-a',
                rank: 60,
                position: 60
              }) 
            ]
            : []
        }
        if (kind === RankingKind.PLAYER) {
          return Object.values(RankingCategory).map((category, index) => entry({
            category,
            entity_id: 'me',
            rank: 101 + index,
            position: 120 - index,
          }))
        }
        if (kind === RankingKind.FACTION) {
          return [
            entry({
              kind,
              entity_id: FactionCode.THE_CONFEDERATION,
              rank: 1,
              position: 1
            }) 
          ]
        }
        return []
      }),
      listAllianceSummaries: vi.fn().mockResolvedValue([]),
      countHumanPlayersByFaction: vi.fn().mockResolvedValue([]),
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      ranking,
      player: {
        listByIds: vi.fn(async (ids: string[]) => ids.map(id => PlayerEntity.create({
          id,
          name: `Name ${id}`,
          faction_code: FactionCode.THE_CONFEDERATION,
          system_controlled: false,
        }))),
        get: vi.fn(async (id: string) => PlayerEntity.create({
          id,
          name: 'Me',
          faction_code: FactionCode.THE_CONFEDERATION,
          system_controlled: false,
        })),
      },
      alliance: {
        listTagsByPlayerIds: vi.fn().mockResolvedValue([
          {
            player_id: 'p-a',
            alliance_id: 'alliance-a',
            tag: 'ABC'
          } 
        ]),
        findMembership: vi.fn().mockResolvedValue(null),
      },
    } as unknown as Repository)
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('RankingListQuery', () => {
    it('returns an empty page with computed_at null before the first snapshot', async () => {
      setup({ has_snapshot: false })

      const result = await new RankingListQuery().run({
        category: RankingCategory.GLOBAL,
        kind: RankingKind.PLAYER,
        page: 1
      })

      expect(result).toEqual({
        computed_at: null,
        page: 1,
        total: 0,
        rows: []
      })
      expect(ranking.listEntries).not.toHaveBeenCalled()
    })

    it('reads 50 rows per page with current names, tags and the 24 h rank change', async () => {
      setup()

      const result = await new RankingListQuery().run({
        category: RankingCategory.GLOBAL,
        kind: RankingKind.PLAYER,
        page: 2
      })

      expect(ranking.listEntries).toHaveBeenCalledWith({
        snapshot_id: latest.id,
        category: RankingCategory.GLOBAL,
        kind: RankingKind.PLAYER,
        offset: RANKING_PAGE_SIZE,
        limit: RANKING_PAGE_SIZE,
      })
      expect(ranking.findSnapshotClosestTo).toHaveBeenCalledWith({
        target: latest.computed_at - RANKING_CHANGE_REFERENCE_MS,
        before: latest.computed_at,
      })
      expect(result.computed_at).toBe(latest.computed_at)
      expect(result.total).toBe(120)
      expect(result.rows).toEqual([
        {
          rank: 51,
          rank_change_24h: 9,
          points: 100,
          entity: {
            kind: RankingKind.PLAYER,
            id: 'p-a',
            name: 'Name p-a',
            faction_code: FactionCode.THE_CONFEDERATION,
            alliance_tag: 'ABC',
          },
        },
        {
          rank: 51,
          rank_change_24h: null,
          points: 100,
          entity: {
            kind: RankingKind.PLAYER,
            id: 'p-b',
            name: 'Name p-b',
            faction_code: FactionCode.THE_CONFEDERATION,
            alliance_tag: null,
          },
        },
      ])
    })

    it('has no rank change without an earlier snapshot', async () => {
      setup({ has_reference: false })

      const result = await new RankingListQuery().run({
        category: RankingCategory.GLOBAL,
        kind: RankingKind.PLAYER,
        page: 2
      })

      expect(result.rows.map(row => row.rank_change_24h)).toEqual([
        null,
        null 
      ])
    })
  })

  describe('RankingMeQuery', () => {
    it('returns no position with computed_at null before the first snapshot', async () => {
      setup({ has_snapshot: false })

      expect(await new RankingMeQuery().run({ player_id: 'me' })).toEqual({
        computed_at: null,
        positions: []
      })
    })

    it('returns the caller rank, points and page per category, and the faction rank', async () => {
      setup()

      const result = await new RankingMeQuery().run({ player_id: 'me' })

      expect(result.computed_at).toBe(latest.computed_at)
      expect(result.positions.map(position => [
        position.kind,
        position.category,
        position.rank,
        position.page 
      ])).toEqual([
        [
          RankingKind.PLAYER,
          RankingCategory.GLOBAL,
          101,
          3 
        ],
        [
          RankingKind.PLAYER,
          RankingCategory.ECONOMY,
          102,
          3 
        ],
        [
          RankingKind.PLAYER,
          RankingCategory.MILITARY,
          103,
          3 
        ],
        [
          RankingKind.FACTION,
          RankingCategory.GLOBAL,
          1,
          1 
        ],
      ])
    })
  })
})

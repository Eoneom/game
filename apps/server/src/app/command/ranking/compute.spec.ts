import type {
  Mock,
  MockInstance
} from 'vitest'
import { computeRankings } from './compute'
import { Factory } from '#adapter/factory'
import { JobQueue } from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import { RankingRepository } from '#app/port/repository/ranking'
import { RANKING_COMPUTE_INTERVAL_MS } from '#app/scheduling/intervals'
import { BuildingCode } from '#core/building/constant/code'
import { FactionCode } from '#core/faction/constant/code'
import { RANKING_SNAPSHOT_RETENTION_MS } from '#core/ranking/constant/limits'
import { RankingEntry } from '#core/ranking/type'
import { RankingCategory } from '#core/ranking/value/category'
import { RankingKind } from '#core/ranking/value/kind'
import { TroopCode } from '#core/troop/constant/code'
import * as time from '#shared/time'

describe('computeRankings', () => {
  const computed_at = 1_700_000_000_000
  let ranking: { [K in keyof RankingRepository]: MockInstance }
  let other_repository_calls: Mock<(...args: unknown[]) => void>
  let scheduleRankingCompute: MockInstance

  function setup(player_count: number): void {
    const ids = Array.from({ length: player_count }, (_, index) => `player-${index}`)
    ranking = {
      listHumanPlayers: vi.fn().mockResolvedValue(ids.map((id, index) => ({
        id,
        name: id,
        faction_code: FactionCode.THE_CONFEDERATION,
        alliance_id: index < 3 ? 'alliance-a' : null,
        military_value: index * 1000,
      }))),
      listHumanBuildingLevels: vi.fn().mockResolvedValue(ids.map(player_id => ({
        player_id,
        code: BuildingCode.CITY_WALL,
        level: 2
      }))),
      listHumanTechnologyLevels: vi.fn().mockResolvedValue([]),
      listHumanTroopCounts: vi.fn().mockResolvedValue(ids.map(player_id => ({
        player_id,
        code: TroopCode.LEGIONNAIRE,
        count: 4
      }))),
      listHumanDefenseCounts: vi.fn().mockResolvedValue([]),
      listAlliances: vi.fn().mockResolvedValue([
        {
          id: 'alliance-a',
          name: 'Alpha'
        } 
      ]),
      createSnapshot: vi.fn(async ({ computed_at: at }: { computed_at: number }) => ({
        id: 'snapshot-id',
        computed_at: at
      })),
      deleteSnapshotsBefore: vi.fn().mockResolvedValue(2),
      findLatestSnapshot: vi.fn(),
      findSnapshotClosestTo: vi.fn(),
      listEntries: vi.fn(),
      countEntries: vi.fn(),
      listEntriesForEntities: vi.fn(),
      listAllianceSummaries: vi.fn(),
      countHumanPlayersByFaction: vi.fn(),
    }
    other_repository_calls = vi.fn<(...args: unknown[]) => void>()
    scheduleRankingCompute = vi.fn().mockResolvedValue('job-id')

    // Any other repository access (per-player lookups) is recorded.
    const forbidden = new Proxy({}, {
      get: () => (...args: unknown[]) => {
        other_repository_calls(...args)
        return Promise.resolve([])
      },
    })
    vi.spyOn(Factory, 'getRepository').mockReturnValue(new Proxy({ ranking }, { get: (target, key) => key === 'ranking' ? target.ranking : forbidden }) as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ scheduleRankingCompute } as unknown as JobQueue)
    vi.spyOn(Factory, 'getLogger').mockReturnValue({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as never)
    vi.spyOn(time, 'now').mockReturnValue(computed_at)
  }

  const repositoryCallCount = (): number => Object.values(ranking)
    .reduce((sum, mock) => sum + mock.mock.calls.length, 0) + other_repository_calls.mock.calls.length

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads players in batched queries whose count does not grow with the number of players', async () => {
    setup(2)
    await computeRankings()
    const calls_for_two = repositoryCallCount()

    setup(60)
    await computeRankings()
    const calls_for_sixty = repositoryCallCount()

    expect(calls_for_sixty).toBe(calls_for_two)
    expect(other_repository_calls).not.toHaveBeenCalled()
    for (const method of [
      'listHumanPlayers',
      'listHumanBuildingLevels',
      'listHumanTechnologyLevels',
      'listHumanTroopCounts',
      'listHumanDefenseCounts',
      'listAlliances',
    ] as const) {
      expect(ranking[method]).toHaveBeenCalledTimes(1)
    }
  })

  it('writes one snapshot with player, alliance and faction entries', async () => {
    setup(4)
    await computeRankings()

    expect(ranking.createSnapshot).toHaveBeenCalledTimes(1)
    const { entries } = ranking.createSnapshot.mock.calls[0][0] as { entries: RankingEntry[] }
    const global_players = entries.filter(entry => entry.kind === RankingKind.PLAYER && entry.category === RankingCategory.GLOBAL)
    // Every player owns the same buildings and troops: everyone shares rank 1.
    expect(global_players).toHaveLength(4)
    expect(global_players.every(entry => entry.rank === 1)).toBe(true)
    expect(global_players[0].points).toBe(Math.floor((2500 + 4250 + 4 * 2500) / 1000))

    const military = entries.filter(entry => entry.kind === RankingKind.PLAYER && entry.category === RankingCategory.MILITARY)
    expect(military.map(entry => [
      entry.entity_id,
      entry.rank,
      entry.points 
    ])).toEqual([
      [
        'player-3',
        1,
        3 
      ],
      [
        'player-2',
        2,
        2 
      ],
      [
        'player-1',
        3,
        1 
      ],
      [
        'player-0',
        4,
        0 
      ],
    ])
    expect(entries.filter(entry => entry.kind === RankingKind.ALLIANCE).map(entry => entry.entity_id)).toEqual([
      'alliance-a',
      'alliance-a',
      'alliance-a',
    ])
    expect(entries.filter(entry => entry.kind === RankingKind.FACTION)).toHaveLength(3)
  })

  it('deletes snapshots older than 7 days and reschedules itself in 60 minutes', async () => {
    setup(1)
    await computeRankings()

    expect(ranking.deleteSnapshotsBefore).toHaveBeenCalledWith(computed_at - RANKING_SNAPSHOT_RETENTION_MS)
    expect(RANKING_SNAPSHOT_RETENTION_MS).toBe(7 * 24 * 60 * 60 * 1000)
    expect(scheduleRankingCompute).toHaveBeenCalledWith({ execute_at: computed_at + RANKING_COMPUTE_INTERVAL_MS })
    expect(RANKING_COMPUTE_INTERVAL_MS).toBe(60 * 60 * 1000)
  })
})

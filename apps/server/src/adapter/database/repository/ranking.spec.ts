import { setRootDatabase } from '#adapter/database/context'
import { PostgresRankingRepository } from '#adapter/database/repository/ranking'
import type { DB } from '#adapter/database/types'
import {
  DummyDriver,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler
} from 'kysely'

/** Compiles the repository SQL against a dummy Postgres driver (no database) and records it. */
describe('PostgresRankingRepository SQL (slice 034)', () => {
  let queries: string[]

  beforeEach(() => {
    queries = []
    setRootDatabase(new Kysely<DB>({
      dialect: {
        createAdapter: () => new PostgresAdapter(),
        createDriver: () => new DummyDriver(),
        createIntrospector: db => new PostgresIntrospector(db),
        createQueryCompiler: () => new PostgresQueryCompiler(),
      },
      log: event => {
        queries.push(event.query.sql)
      },
    }))
  })

  it('counts every troop of human players wherever it is: stationed, in movement or abroad', async () => {
    await new PostgresRankingRepository().listHumanTroopCounts()

    expect(queries).toHaveLength(1)
    const [ query ] = queries
    expect(query).toContain('sum(troop.count)')
    expect(query).toContain('"player"."system_controlled" = $1')
    expect(query).toContain('group by "troop"."player_id", "troop"."code"')
    expect(query).not.toContain('cell_id')
    expect(query).not.toContain('movement_id')
  })

  it('reads finished building and technology levels only (queues are ignored)', async () => {
    const repository = new PostgresRankingRepository()
    await repository.listHumanBuildingLevels()
    await repository.listHumanTechnologyLevels()

    expect(queries).toHaveLength(2)
    for (const query of queries) {
      expect(query).not.toContain('queue')
      expect(query).toContain('"player"."system_controlled" = $1')
    }
    expect(queries[0]).toContain('inner join "city" on "city"."id" = "building"."city_id"')
  })

  it('reads built defenses only, summed per city owner', async () => {
    await new PostgresRankingRepository().listHumanDefenseCounts()

    expect(queries[0]).toContain('sum(defense.count)')
    expect(queries[0]).not.toContain('defense_build_queue')
  })

  it('loads human players with their alliance in one query', async () => {
    await new PostgresRankingRepository().listHumanPlayers()

    expect(queries).toHaveLength(1)
    expect(queries[0]).toContain('left join "alliance_member"')
    expect(queries[0]).toContain('"player"."military_value"')
  })

  it('deletes expired snapshots, entries cascading', async () => {
    await new PostgresRankingRepository().deleteSnapshotsBefore(1_000)

    expect(queries).toEqual([ 'delete from "ranking_snapshot" where "computed_at" < $1' ])
  })
})

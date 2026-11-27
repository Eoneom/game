// Loads the repositories in their usual order (the generic repository imports the factory).
import '#adapter/factory'
import { setRootDatabase } from '#adapter/database/context'
import { PostgresBuildingRepository } from '#adapter/database/repository/building'
import { PostgresReportRepository } from '#adapter/database/repository/report'
import type { DB } from '#adapter/database/types'
import {
  DummyDriver,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler
} from 'kysely'

/** Map reads of slice 044, compiled against a dummy Postgres driver (no database). */
describe('world map repository reads (slice 044)', () => {
  let queries: { sql: string, parameters: readonly unknown[] }[]
  let db: Kysely<DB>

  beforeEach(() => {
    queries = []
    db = new Kysely<DB>({
      dialect: {
        createAdapter: () => new PostgresAdapter(),
        createDriver: () => new DummyDriver(),
        createIntrospector: kysely => new PostgresIntrospector(kysely),
        createQueryCompiler: () => new PostgresQueryCompiler(),
      },
      log: event => {
        queries.push({
          sql: event.query.sql,
          parameters: event.query.parameters
        })
      },
    })
    setRootDatabase(db)
  })

  describe('building.sumLevelsByCityIds', () => {
    it('sums every building level (Enceinte included) per city in one grouped query', async () => {
      await new PostgresBuildingRepository(db).sumLevelsByCityIds([
        'c1',
        'c2'
      ])

      expect(queries).toHaveLength(1)
      expect(queries[0].sql).toBe('select "city_id", sum("level") as "total" from "building" where "city_id" in ($1, $2) group by "city_id"')
      expect(queries[0].parameters).toEqual([
        'c1',
        'c2'
      ])
    })

    it('sends no query without cities', async () => {
      expect(await new PostgresBuildingRepository(db).sumLevelsByCityIds([])).toEqual([])
      expect(queries).toHaveLength(0)
    })
  })

  describe('report.listLatestSpyIntel', () => {
    it('keeps the viewer\'s latest successful spy report per cell', async () => {
      await new PostgresReportRepository(db).listLatestSpyIntel({
        player_id: 'p1',
        coordinates: [
          {
            x: 3,
            y: 4
          },
          {
            x: 5,
            y: 6
          }
        ]
      })

      expect(queries).toHaveLength(1)
      const [
        {
          sql, parameters
        }
      ] = queries
      expect(sql).toContain('select distinct on ("report"."destination_x", "report"."destination_y")')
      expect(sql).toContain('inner join "report_spy" on "report_spy"."report_id" = "report"."id"')
      // Only the viewer's own reports: another player's reports are never returned.
      expect(sql).toContain('"report"."player_id" = $1')
      expect(sql).toContain('"report"."type" = $2')
      expect(sql).toContain('(report_spy.metadata_json->>\'success\')::boolean = $3')
      expect(sql).toContain('order by "report"."destination_x", "report"."destination_y", "report"."recorded_at" desc')
      expect(parameters).toEqual([
        'p1',
        'spy',
        true,
        3,
        4,
        5,
        6
      ])
    })

    it('sends no query without coordinates', async () => {
      expect(await new PostgresReportRepository(db).listLatestSpyIntel({
        player_id: 'p1',
        coordinates: []
      })).toEqual([])
      expect(queries).toHaveLength(0)
    })
  })
})

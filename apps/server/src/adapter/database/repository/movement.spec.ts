// Loads the repositories in their usual order (the generic repository imports the factory).
import '#adapter/factory'
import { setRootDatabase } from '#adapter/database/context'
import {
  down,
  up
} from '#adapter/database/migrations/00022_movement_return'
import { PostgresMovementRepository } from '#adapter/database/repository/movement'
import type { DB } from '#adapter/database/types'
import { MovementAction } from '#core/troop/constant/movement-action'
import { MovementKind } from '#core/troop/constant/movement-kind'
import { MovementEntity } from '#core/troop/movement/entity'
import {
  DummyDriver,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler
} from 'kysely'

/** Compiles the SQL against a dummy Postgres driver (no database) and records it (slice 045). */
describe('movement.is_return (slice 045)', () => {
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

  it('migration adds a not-null column defaulting to false, and down drops it', async () => {
    await up(db as unknown as Kysely<unknown>)
    expect(queries.map(query => query.sql)).toEqual([ 'alter table "movement" add column "is_return" boolean default false not null' ])

    queries = []
    await down(db as unknown as Kysely<unknown>)
    expect(queries.map(query => query.sql)).toEqual([ 'alter table "movement" drop column "is_return"' ])
  })

  it('stores the flag on insert', async () => {
    const repository = new PostgresMovementRepository(db)
    await repository.create(MovementEntity.create({
      id: 'm1',
      player_id: 'p1',
      action: MovementAction.BASE,
      origin: {
        x: 1,
        y: 1
      },
      destination: {
        x: 2,
        y: 2
      },
      is_return: true,
    }))

    const [ insert ] = queries
    expect(insert.sql).toContain('"is_return"')
    expect(insert.parameters).toContain(true)
  })

  it('reads the flag back, and rows without it (pre-migration default) are outgoing', () => {
    const repository = new PostgresMovementRepository(db) as unknown as {
      buildFromRow: (row: Record<string, unknown>) => MovementEntity
    }
    const row = {
      id: 'm1',
      player_id: 'p1',
      action: MovementAction.EXPLORE,
      origin_x: 1,
      origin_y: 1,
      destination_x: 2,
      destination_y: 2,
      plastic: 0,
      mushroom: 0,
      plasma: 0,
      water: 0,
      combat_strategy: null,
      exchange_trade_id: null,
    }

    expect(repository.buildFromRow({
      ...row,
      is_return: false
    }).getKind()).toBe(MovementKind.OUTGOING)
    expect(repository.buildFromRow({
      ...row,
      is_return: true
    }).getKind()).toBe(MovementKind.RETURN)
  })
})

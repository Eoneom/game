// Loads the repositories in their usual order (the generic repository imports the factory).
import '#adapter/factory'
import { setRootDatabase } from '#adapter/database/context'
import { PostgresExchangeRepository } from '#adapter/database/repository/exchange'
import type { DB } from '#adapter/database/types'
import { ExchangeResource } from '#core/exchange/value/resource'
import { ExchangeSide } from '#core/exchange/value/side'
import { FactionCode } from '#core/faction/constant/code'
import {
  DummyDriver,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler
} from 'kysely'

/** Exchange reads of slice 046, compiled against a dummy Postgres driver (no database). */
describe('exchange repository reads (slice 046)', () => {
  let queries: { sql: string, parameters: readonly unknown[] }[]

  beforeEach(() => {
    queries = []
    setRootDatabase(new Kysely<DB>({
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
    }))
  })

  it('getBook sums the viewer\'s own remaining lots next to the level total', async () => {
    await new PostgresExchangeRepository().getBook({
      faction_code: FactionCode.THE_CONFEDERATION,
      resource: ExchangeResource.PLASTIC,
      depth: 10,
      viewer_player_id: 'viewer'
    })

    expect(queries).toHaveLength(2)
    for (const query of queries) {
      expect(query.sql).toContain('sum(lots - filled_lots) as "lots"')
      expect(query.sql).toContain('sum(case when player_id = $1 then lots - filled_lots else 0 end) as "own_lots"')
      // Totals keep the viewer's orders: no player filter on the levels.
      expect(query.sql).not.toContain('"player_id" !=')
      expect(query.parameters[0]).toBe('viewer')
    }
  })

  it('bestLevels keeps the best level per book side among other players\' open orders, in one query', async () => {
    await new PostgresExchangeRepository().bestLevels({
      faction_code: FactionCode.THE_ASH_LITURGY,
      exclude_player_id: 'viewer'
    })

    expect(queries).toHaveLength(1)
    expect(queries[0].sql).toBe('select distinct on ("resource", "side") "resource", "side", "price", sum(lots - filled_lots) as "lots" from "exchange_order" where "faction_code" = $1 and "status" = $2 and "player_id" != $3 group by "resource", "side", "price" order by "resource", "side", case when side = $4 then -price else price end')
    expect(queries[0].parameters).toEqual([
      FactionCode.THE_ASH_LITURGY,
      'open',
      'viewer',
      ExchangeSide.BUY
    ])
  })

  it('listMatchable selects like listMatchableForUpdate without the row lock', async () => {
    const query = {
      faction_code: FactionCode.THE_CONFEDERATION,
      resource: ExchangeResource.PLASMA,
      side: ExchangeSide.SELL,
      limit_price: 9,
      exclude_player_id: 'viewer'
    }
    const repository = new PostgresExchangeRepository()
    await repository.listMatchable(query)
    await repository.listMatchableForUpdate(query)

    expect(queries).toHaveLength(2)
    expect(queries[0].sql).not.toContain('for update')
    expect(`${queries[0].sql} for update`).toBe(queries[1].sql)
    expect(queries[0].parameters).toEqual(queries[1].parameters)
  })

  it('lastTrade reads the newest trade of the book', async () => {
    await new PostgresExchangeRepository().lastTrade({
      faction_code: FactionCode.THE_CONFEDERATION,
      resource: ExchangeResource.MUSHROOM
    })

    expect(queries).toHaveLength(1)
    expect(queries[0].sql).toContain('order by "executed_at" desc, "seq" desc limit $3')
    expect(queries[0].parameters).toEqual([
      FactionCode.THE_CONFEDERATION,
      ExchangeResource.MUSHROOM,
      1
    ])
  })
})

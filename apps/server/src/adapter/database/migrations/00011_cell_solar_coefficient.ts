import { Kysely, sql } from 'kysely'
import type { DB } from '#adapter/database/types'
import { PerlinService } from '#core/world/perlin'
import { WorldService } from '#core/world/service'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('cell')
    .addColumn('solar_coefficient', 'double precision', (col) => col.notNull().defaultTo(sql`1`))
    .execute()

  const typed_db = db as Kysely<DB>
  const solar_perlin = new PerlinService()
  const cells = await typed_db
    .selectFrom('cell')
    .select(['id', 'x', 'y', 'sector'])
    .execute()

  for (const cell of cells) {
    const solar_coefficient = WorldService.getSolarCoefficient({
      perlin: solar_perlin,
      coordinates: {
        x: cell.x,
        y: cell.y,
        sector: cell.sector
      }
    })

    await typed_db
      .updateTable('cell')
      .set({ solar_coefficient })
      .where('id', '=', cell.id)
      .execute()
  }

  await db.schema
    .alterTable('cell')
    .alterColumn('solar_coefficient', (col) => col.dropDefault())
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('cell')
    .dropColumn('solar_coefficient')
    .execute()
}

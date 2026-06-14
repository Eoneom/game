import {
  Kysely, sql
} from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('city')
    .addColumn('cell_id', 'uuid')
    .execute()

  await sql`
    UPDATE city
    SET cell_id = cell.id
    FROM cell
    WHERE cell.city_id = city.id
  `.execute(db)

  await db.schema
    .alterTable('city')
    .alterColumn('cell_id', (col) => col.setNotNull())
    .execute()

  await db.schema
    .alterTable('city')
    .addUniqueConstraint('city_cell_id_unique', [ 'cell_id' ])
    .execute()

  await db.schema
    .alterTable('city')
    .addForeignKeyConstraint(
      'city_cell_id_fkey',
      [ 'cell_id' ],
      'cell',
      [ 'id' ]
    )
    .onDelete('cascade')
    .execute()

  await db.schema
    .alterTable('cell')
    .dropColumn('city_id')
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('cell')
    .addColumn('city_id', 'uuid', (col) => col.references('city.id').onDelete('set null'))
    .execute()

  await sql`
    UPDATE cell
    SET city_id = city.id
    FROM city
    WHERE city.cell_id = cell.id
  `.execute(db)

  await db.schema
    .alterTable('city')
    .dropConstraint('city_cell_id_fkey')
    .execute()

  await db.schema
    .alterTable('city')
    .dropConstraint('city_cell_id_unique')
    .execute()

  await db.schema
    .alterTable('city')
    .dropColumn('cell_id')
    .execute()
}

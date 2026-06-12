import {
  Kysely, sql
} from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('player')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('name', 'text', (col) => col.notNull())
    .execute()

  await db.schema
    .createTable('auth')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('player_id', 'uuid', (col) => col.notNull().references('player.id').onDelete('cascade'))
    .addColumn('token', 'text', (col) => col.notNull())
    .addColumn('last_action_at', 'timestamptz', (col) => col.notNull())
    .execute()

  await db.schema
    .createTable('city')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('player_id', 'uuid', (col) => col.notNull().references('player.id').onDelete('cascade'))
    .addColumn('name', 'text', (col) => col.notNull())
    .execute()

  await db.schema
    .createTable('building')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('city_id', 'uuid', (col) => col.notNull().references('city.id').onDelete('cascade'))
    .addColumn('code', 'text', (col) => col.notNull())
    .addColumn('level', 'integer', (col) => col.notNull())
    .execute()

  await db.schema
    .createTable('building_upgrade_queue')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('city_id', 'uuid', (col) => col.notNull().references('city.id').onDelete('cascade'))
    .addColumn('building_code', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute()

  await db.schema
    .createIndex('building_upgrade_queue_city_id_created_at_idx')
    .on('building_upgrade_queue')
    .columns([
      'city_id',
      'created_at'
    ])
    .execute()

  await db.schema
    .createTable('cell')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('x', 'integer', (col) => col.notNull())
    .addColumn('y', 'integer', (col) => col.notNull())
    .addColumn('type', 'text', (col) => col.notNull())
    .addColumn('plastic_coefficient', 'double precision', (col) => col.notNull())
    .addColumn('mushroom_coefficient', 'double precision', (col) => col.notNull())
    .addColumn('solar_coefficient', 'double precision', (col) => col.notNull())
    .addColumn('city_id', 'uuid', (col) => col.references('city.id').onDelete('set null'))
    .addUniqueConstraint('cell_x_y_unique', [
      'x',
      'y'
    ])
    .execute()

  await db.schema
    .createTable('exploration')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('player_id', 'uuid', (col) => col.notNull().references('player.id').onDelete('cascade'))
    .execute()

  await db.schema
    .createTable('exploration_cell')
    .addColumn('exploration_id', 'uuid', (col) => col.notNull().references('exploration.id').onDelete('cascade'))
    .addColumn('cell_id', 'uuid', (col) => col.notNull().references('cell.id').onDelete('cascade'))
    .addPrimaryKeyConstraint('exploration_cell_pkey', [
      'exploration_id',
      'cell_id'
    ])
    .execute()

  await db.schema
    .createTable('movement')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('player_id', 'uuid', (col) => col.notNull().references('player.id').onDelete('cascade'))
    .addColumn('action', 'text', (col) => col.notNull())
    .addColumn('origin_x', 'integer', (col) => col.notNull())
    .addColumn('origin_y', 'integer', (col) => col.notNull())
    .addColumn('destination_x', 'integer', (col) => col.notNull())
    .addColumn('destination_y', 'integer', (col) => col.notNull())
    .addColumn('plastic', 'integer', (col) => col.notNull().defaultTo(sql`0`))
    .addColumn('mushroom', 'integer', (col) => col.notNull().defaultTo(sql`0`))
    .addColumn('plasma', 'integer', (col) => col.notNull().defaultTo(sql`0`))
    .execute()

  await db.schema
    .createTable('outpost')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('player_id', 'uuid', (col) => col.notNull().references('player.id').onDelete('cascade'))
    .addColumn('cell_id', 'uuid', (col) => col.notNull().references('cell.id').onDelete('cascade'))
    .addColumn('type', 'text', (col) => col.notNull())
    .execute()

  await db.schema
    .createTable('report')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('type', 'text', (col) => col.notNull())
    .addColumn('player_id', 'uuid', (col) => col.notNull().references('player.id').onDelete('cascade'))
    .addColumn('origin_x', 'integer', (col) => col.notNull())
    .addColumn('origin_y', 'integer', (col) => col.notNull())
    .addColumn('destination_x', 'integer', (col) => col.notNull())
    .addColumn('destination_y', 'integer', (col) => col.notNull())
    .addColumn('recorded_at', 'timestamptz', (col) => col.notNull())
    .addColumn('was_read', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('plastic', 'integer', (col) => col.notNull().defaultTo(sql`0`))
    .addColumn('mushroom', 'integer', (col) => col.notNull().defaultTo(sql`0`))
    .addColumn('plasma', 'integer', (col) => col.notNull().defaultTo(sql`0`))
    .addColumn('remaining_plastic', 'integer', (col) => col.notNull().defaultTo(sql`0`))
    .addColumn('remaining_mushroom', 'integer', (col) => col.notNull().defaultTo(sql`0`))
    .addColumn('remaining_plasma', 'integer', (col) => col.notNull().defaultTo(sql`0`))
    .execute()

  await db.schema
    .createTable('report_troop')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('report_id', 'uuid', (col) => col.notNull().references('report.id').onDelete('cascade'))
    .addColumn('code', 'text', (col) => col.notNull())
    .addColumn('count', 'integer', (col) => col.notNull())
    .execute()

  await db.schema
    .createTable('resource_stock')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('cell_id', 'uuid', (col) => col.notNull().unique().references('cell.id').onDelete('cascade'))
    .addColumn('plastic', 'integer', (col) => col.notNull())
    .addColumn('mushroom', 'integer', (col) => col.notNull())
    .addColumn('plasma', 'integer', (col) => col.notNull().defaultTo(sql`0`))
    .addColumn('last_plastic_gather', 'timestamptz', (col) => col.notNull())
    .addColumn('last_mushroom_gather', 'timestamptz', (col) => col.notNull())
    .addColumn('last_plasma_gather', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute()

  await db.schema
    .createTable('technology')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('player_id', 'uuid', (col) => col.notNull().references('player.id').onDelete('cascade'))
    .addColumn('code', 'text', (col) => col.notNull())
    .addColumn('level', 'integer', (col) => col.notNull())
    .execute()

  await db.schema
    .createTable('troop')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('code', 'text', (col) => col.notNull())
    .addColumn('player_id', 'uuid', (col) => col.notNull().references('player.id').onDelete('cascade'))
    .addColumn('cell_id', 'uuid', (col) => col.references('cell.id').onDelete('set null'))
    .addColumn('count', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('movement_id', 'uuid', (col) => col.references('movement.id').onDelete('set null'))
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('troop').execute()
  await db.schema.dropTable('technology').execute()
  await db.schema.dropTable('resource_stock').execute()
  await db.schema.dropTable('report_troop').execute()
  await db.schema.dropTable('report').execute()
  await db.schema.dropTable('outpost').execute()
  await db.schema.dropTable('movement').execute()
  await db.schema.dropTable('exploration_cell').execute()
  await db.schema.dropTable('exploration').execute()
  await db.schema.dropTable('cell').execute()
  await db.schema.dropTable('building_upgrade_queue').execute()
  await db.schema.dropTable('building').execute()
  await db.schema.dropTable('city').execute()
  await db.schema.dropTable('auth').execute()
  await db.schema.dropTable('player').execute()
}

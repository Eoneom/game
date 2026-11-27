import {
  Kysely, sql
} from 'kysely'

/**
 * Slice 035 (part 2): the faction exchange (order book, carrier reservations, trades), the `trade` report metadata
 * and the trade link on exchange convoys.
 * - `exchange_carrier_reservation` stores the reserved stack by `troop_code`: the stack is (order city cell, order
 *   player, code). Battles rewrite every troop row of a cell with new ids (slice 024), so a troop id would dangle.
 * - `movement.exchange_trade_id` marks exchange convoys and their carriers' return trips (excluded from the cap).
 * - `exchange_trade.seq` orders trades sharing an `executed_at` (the fills of one incoming order).
 * - `report.type` is free text (no check constraint), so the `trade` report type needs no schema change.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('exchange_order')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('player_id', 'uuid', (col) => col.notNull().references('player.id').onDelete('cascade'))
    .addColumn('faction_code', 'text', (col) => col.notNull())
    .addColumn('city_id', 'uuid', (col) => col.notNull().references('city.id').onDelete('cascade'))
    .addColumn('side', 'text', (col) => col.notNull())
    .addColumn('resource', 'text', (col) => col.notNull())
    .addColumn('lots', 'integer', (col) => col.notNull())
    .addColumn('filled_lots', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('price', 'integer', (col) => col.notNull())
    .addColumn('status', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.notNull())
    .addColumn('closed_at', 'timestamptz')
    .execute()

  await db.schema
    .createIndex('exchange_order_book_idx')
    .on('exchange_order')
    .columns([
      'faction_code',
      'resource',
      'side',
      'status',
      'price',
      'created_at'
    ])
    .execute()

  await db.schema
    .createIndex('exchange_order_player_status_idx')
    .on('exchange_order')
    .columns([
      'player_id',
      'status'
    ])
    .execute()

  await db.schema
    .createIndex('exchange_order_city_status_idx')
    .on('exchange_order')
    .columns([
      'city_id',
      'status'
    ])
    .execute()

  await db.schema
    .createTable('exchange_carrier_reservation')
    .addColumn('order_id', 'uuid', (col) => col.notNull().references('exchange_order.id').onDelete('cascade'))
    .addColumn('troop_code', 'text', (col) => col.notNull())
    .addColumn('count', 'integer', (col) => col.notNull())
    .addPrimaryKeyConstraint('exchange_carrier_reservation_pkey', [
      'order_id',
      'troop_code'
    ])
    .execute()

  await db.schema
    .createTable('exchange_trade')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('faction_code', 'text', (col) => col.notNull())
    .addColumn('resource', 'text', (col) => col.notNull())
    .addColumn('buy_order_id', 'uuid', (col) => col.notNull().references('exchange_order.id').onDelete('cascade'))
    .addColumn('sell_order_id', 'uuid', (col) => col.notNull().references('exchange_order.id').onDelete('cascade'))
    .addColumn('lots', 'integer', (col) => col.notNull())
    .addColumn('price', 'integer', (col) => col.notNull())
    .addColumn('executed_at', 'timestamptz', (col) => col.notNull())
    // Insertion order: the fills of one incoming order share `executed_at`.
    .addColumn('seq', 'bigserial', (col) => col.notNull())
    .execute()

  await db.schema
    .createIndex('exchange_trade_faction_resource_executed_at_idx')
    .on('exchange_trade')
    .columns([
      'faction_code',
      'resource',
      'executed_at'
    ])
    .execute()

  await db.schema
    .alterTable('movement')
    .addColumn('exchange_trade_id', 'uuid', (col) => col.references('exchange_trade.id').onDelete('set null'))
    .execute()

  await db.schema
    .createTable('report_trade')
    .addColumn('report_id', 'uuid', (col) => col.primaryKey().references('report.id').onDelete('cascade'))
    .addColumn('trade_id', 'uuid', (col) => col.notNull())
    .addColumn('counterparty_player_id', 'uuid', (col) => col.notNull())
    .addColumn('metadata_json', 'jsonb', (col) => col.notNull())
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('report_trade').execute()
  await db.schema.alterTable('movement').dropColumn('exchange_trade_id').execute()
  await db.schema.dropTable('exchange_trade').execute()
  await db.schema.dropTable('exchange_carrier_reservation').execute()
  await db.schema.dropTable('exchange_order').execute()
}

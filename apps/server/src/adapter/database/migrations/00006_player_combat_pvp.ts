import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('movement')
    .addColumn('combat_strategy', 'text')
    .execute()

  await db.schema
    .alterTable('city')
    .addColumn('default_combat_strategy', 'text')
    .execute()

  await db.schema
    .alterTable('outpost')
    .addColumn('default_combat_strategy', 'text')
    .execute()

  await db.schema
    .createTable('battle')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('movement_id', 'uuid', (col) => col.notNull().references('movement.id').onDelete('cascade'))
    .addColumn('attacker_player_id', 'uuid', (col) => col.notNull().references('player.id').onDelete('cascade'))
    .addColumn('defender_player_id', 'uuid', (col) => col.notNull().references('player.id').onDelete('cascade'))
    .addColumn('cell_id', 'uuid', (col) => col.notNull().references('cell.id').onDelete('cascade'))
    .addColumn('target_kind', 'text', (col) => col.notNull())
    .addColumn('target_id', 'uuid')
    .addColumn('attacker_strategy', 'text', (col) => col.notNull())
    .addColumn('defender_strategy', 'text', (col) => col.notNull())
    .addColumn('current_round', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('status', 'text', (col) => col.notNull())
    .addColumn('winner', 'text')
    .addColumn('state_json', 'jsonb', (col) => col.notNull())
    .addColumn('started_at', 'timestamptz', (col) => col.notNull())
    .addColumn('finished_at', 'timestamptz')
    .execute()

  await db.schema
    .createIndex('battle_movement_id_unique_idx')
    .on('battle')
    .column('movement_id')
    .unique()
    .execute()

  await db.schema
    .createTable('report_battle')
    .addColumn('report_id', 'uuid', (col) => col.primaryKey().references('report.id').onDelete('cascade'))
    .addColumn('battle_id', 'uuid', (col) => col.notNull().references('battle.id').onDelete('cascade'))
    .addColumn('movement_id', 'uuid', (col) => col.notNull())
    .addColumn('perspective', 'text', (col) => col.notNull())
    .addColumn('attacker_player_id', 'uuid', (col) => col.notNull())
    .addColumn('defender_player_id', 'uuid', (col) => col.notNull())
    .addColumn('attacker_faction_code', 'text', (col) => col.notNull())
    .addColumn('defender_faction_code', 'text', (col) => col.notNull())
    .addColumn('target_kind', 'text', (col) => col.notNull())
    .addColumn('target_id', 'uuid')
    .addColumn('winner', 'text', (col) => col.notNull())
    .addColumn('attacker_strategy', 'text', (col) => col.notNull())
    .addColumn('defender_strategy', 'text', (col) => col.notNull())
    .addColumn('rounds_played', 'integer', (col) => col.notNull())
    .addColumn('outcome_json', 'jsonb', (col) => col.notNull())
    .addColumn('casualties_attacker_json', 'jsonb', (col) => col.notNull())
    .addColumn('casualties_defender_json', 'jsonb', (col) => col.notNull())
    .addColumn('round_summaries_json', 'jsonb', (col) => col.notNull())
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('report_battle').execute()
  await db.schema.dropTable('battle').execute()

  await db.schema
    .alterTable('outpost')
    .dropColumn('default_combat_strategy')
    .execute()

  await db.schema
    .alterTable('city')
    .dropColumn('default_combat_strategy')
    .execute()

  await db.schema
    .alterTable('movement')
    .dropColumn('combat_strategy')
    .execute()
}

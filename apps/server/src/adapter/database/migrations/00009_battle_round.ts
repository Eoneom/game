import { Kysely, sql } from 'kysely'

/**
 * Normalize battle rounds (slice 024 O004): move `battle.state_json.round_summaries`
 * into one `battle_round` row per round.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('battle_round')
    .addColumn('battle_id', 'uuid', (col) => col.notNull().references('battle.id').onDelete('cascade'))
    .addColumn('round', 'integer', (col) => col.notNull())
    .addColumn('attacker_attack_pool', 'double precision', (col) => col.notNull())
    .addColumn('defender_attack_pool', 'double precision', (col) => col.notNull())
    .addColumn('attacker_life_pool', 'double precision', (col) => col.notNull())
    .addColumn('defender_life_pool', 'double precision', (col) => col.notNull())
    .addColumn('attacker_losses', 'jsonb', (col) => col.notNull())
    .addColumn('defender_losses', 'jsonb', (col) => col.notNull())
    .addPrimaryKeyConstraint('battle_round_pkey', ['battle_id', 'round'])
    .execute()

  await sql`
    INSERT INTO battle_round (
      battle_id, round,
      attacker_attack_pool, defender_attack_pool,
      attacker_life_pool, defender_life_pool,
      attacker_losses, defender_losses
    )
    SELECT
      b.id,
      (r->>'round')::integer,
      (r->>'attacker_attack_pool')::double precision,
      (r->>'defender_attack_pool')::double precision,
      (r->>'attacker_life_pool')::double precision,
      (r->>'defender_life_pool')::double precision,
      COALESCE(r->'attacker_losses', '[]'::jsonb),
      COALESCE(r->'defender_losses', '[]'::jsonb)
    FROM battle b
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(b.state_json->'round_summaries', '[]'::jsonb)) AS r
    ON CONFLICT DO NOTHING
  `.execute(db)

  await sql`UPDATE battle SET state_json = state_json - 'round_summaries'`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    UPDATE battle b
    SET state_json = b.state_json || jsonb_build_object(
      'round_summaries',
      COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'round', br.round,
            'attacker_attack_pool', br.attacker_attack_pool,
            'defender_attack_pool', br.defender_attack_pool,
            'attacker_life_pool', br.attacker_life_pool,
            'defender_life_pool', br.defender_life_pool,
            'attacker_losses', br.attacker_losses,
            'defender_losses', br.defender_losses
          )
          ORDER BY br.round
        )
        FROM battle_round br
        WHERE br.battle_id = b.id
      ), '[]'::jsonb)
    )
  `.execute(db)

  await db.schema.dropTable('battle_round').execute()
}

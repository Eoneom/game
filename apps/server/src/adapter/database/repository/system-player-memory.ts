import type { DB } from '#adapter/database/types'
import type { SystemPlayerMemoryRepository } from '#app/port/repository/system-player-memory'
import {
  EMPTY_SYSTEM_PLAYER_MEMORY,
  type SystemPlayerMemory,
} from '#core/player/system/memory'
import type { Kysely } from 'kysely'

function parseMemoryJson(value: unknown): SystemPlayerMemory {
  if (!value || typeof value !== 'object') {
    return EMPTY_SYSTEM_PLAYER_MEMORY
  }
  const record = value as Record<string, unknown>
  const failed_base_cells = Array.isArray(record.failed_base_cells)
    ? record.failed_base_cells.filter(
      (entry): entry is { x: number, y: number } => typeof entry === 'object'
        && entry !== null
        && typeof (entry as { x?: unknown }).x === 'number'
        && typeof (entry as { y?: unknown }).y === 'number',
    )
    : []
  const failed_attack_targets = Array.isArray(record.failed_attack_targets)
    ? record.failed_attack_targets.filter(
      (entry): entry is { x: number, y: number } => typeof entry === 'object'
        && entry !== null
        && typeof (entry as { x?: unknown }).x === 'number'
        && typeof (entry as { y?: unknown }).y === 'number',
    )
    : []
  return {
    failed_base_cells,
    failed_attack_targets,
  }
}

export class PostgresSystemPlayerMemoryRepository implements SystemPlayerMemoryRepository {
  constructor(private readonly db: Kysely<DB>) {}

  async get(player_id: string): Promise<SystemPlayerMemory> {
    const row = await this.db
      .selectFrom('system_player_memory')
      .select('memory_json')
      .where('player_id', '=', player_id)
      .executeTakeFirst()
    if (!row) {
      return EMPTY_SYSTEM_PLAYER_MEMORY
    }
    return parseMemoryJson(row.memory_json)
  }

  async upsert(player_id: string, memory: SystemPlayerMemory): Promise<void> {
    await this.db
      .insertInto('system_player_memory')
      .values({
        player_id,
        memory_json: memory,
      })
      .onConflict((oc) => oc
        .column('player_id')
        .doUpdateSet({
          memory_json: memory,
        }))
      .execute()
  }
}

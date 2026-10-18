import type { SystemPlayerMemory } from '#core/player/system/memory'

export type SystemPlayerMemoryRepository = {
  get(player_id: string): Promise<SystemPlayerMemory>
  upsert(player_id: string, memory: SystemPlayerMemory): Promise<void>
}

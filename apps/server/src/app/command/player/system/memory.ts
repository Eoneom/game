import { Factory } from '#adapter/factory'
import {
  appendFailedAttackTarget,
  appendFailedBaseCell,
  type SystemPlayerMemory,
} from '#core/player/system/memory'
import type { Coordinates } from '#core/world/value/coordinates'

export async function loadSystemPlayerMemory(player_id: string): Promise<SystemPlayerMemory> {
  return Factory.getRepository().system_player_memory.get(player_id)
}

export async function recordFailedSystemBaseCell({
  player_id,
  coordinates,
}: {
  player_id: string
  coordinates: Coordinates
}): Promise<void> {
  const repository = Factory.getRepository()
  const memory = await repository.system_player_memory.get(player_id)
  await repository.system_player_memory.upsert(
    player_id,
    appendFailedBaseCell(memory, coordinates),
  )
}

export async function recordFailedSystemAttackTarget({
  player_id,
  coordinates,
}: {
  player_id: string
  coordinates: Coordinates
}): Promise<void> {
  const repository = Factory.getRepository()
  const memory = await repository.system_player_memory.get(player_id)
  await repository.system_player_memory.upsert(
    player_id,
    appendFailedAttackTarget(memory, coordinates),
  )
}

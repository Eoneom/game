import { Factory } from '#adapter/factory'
import {
  appendFailedAttackTarget,
  appendFailedBaseCell,
  type SystemPlayerMemory,
} from '#core/player/system/memory'
import type { Coordinates } from '#core/world/value/coordinates'
import type { SystemEmpireSnapshot } from '#core/player/system/empire-snapshot'
import {
  isSystemMovementSaturated,
  nextSystemMovementSaturatedTicks,
} from '#core/player/system/movement-budget'

export async function loadSystemPlayerMemory(player_id: string): Promise<SystemPlayerMemory> {
  return Factory.getRepository().system_player_memory.get(player_id)
}

/** Counts consecutive ticks at (or one short of) the movement cap; returns the updated memory. */
export async function recordSystemMovementSaturation({
  player_id,
  snapshot,
}: {
  player_id: string
  snapshot: Pick<SystemEmpireSnapshot, 'movement_used' | 'movement_limit' | 'memory'>
}): Promise<SystemPlayerMemory> {
  const movement_saturated_ticks = nextSystemMovementSaturatedTicks({
    previous_ticks: snapshot.memory.movement_saturated_ticks,
    saturated: isSystemMovementSaturated(snapshot),
  })
  if (movement_saturated_ticks === snapshot.memory.movement_saturated_ticks) {
    return snapshot.memory
  }
  const memory: SystemPlayerMemory = {
    ...snapshot.memory,
    movement_saturated_ticks,
  }
  await Factory.getRepository().system_player_memory.upsert(player_id, memory)
  return memory
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

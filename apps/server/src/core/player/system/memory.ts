import type { Coordinates } from '#core/world/value/coordinates'

export type SystemPlayerMemoryCoordinates = {
  x: number
  y: number
}

export type SystemPlayerFailedAttackMemory = SystemPlayerMemoryCoordinates & {
  recorded_at_tick?: number
}

/** Cross-tick memory persisted per system-controlled player. */
export type SystemPlayerMemory = {
  failed_base_cells: SystemPlayerMemoryCoordinates[]
  failed_attack_targets: SystemPlayerFailedAttackMemory[]
}

export const EMPTY_SYSTEM_PLAYER_MEMORY: SystemPlayerMemory = {
  failed_base_cells: [],
  failed_attack_targets: [],
}

export function coordinatesKey(coords: SystemPlayerMemoryCoordinates): string {
  return `${coords.x},${coords.y}`
}

export function isCoordinatesBlocked(
  coords: Coordinates,
  blocked: readonly SystemPlayerMemoryCoordinates[],
): boolean {
  return blocked.some(cell => cell.x === coords.x && cell.y === coords.y)
}

export function appendFailedBaseCell(
  memory: SystemPlayerMemory,
  coords: Coordinates,
  max_entries = 32,
): SystemPlayerMemory {
  const key = coordinatesKey(coords)
  const without = memory.failed_base_cells.filter(cell => coordinatesKey(cell) !== key)
  return {
    ...memory,
    failed_base_cells: [
      {
        x: coords.x,
        y: coords.y,
      },
      ...without,
    ].slice(0, max_entries),
  }
}

export function appendFailedAttackTarget(
  memory: SystemPlayerMemory,
  coords: Coordinates,
  max_entries = 32,
): SystemPlayerMemory {
  const key = coordinatesKey(coords)
  const without = memory.failed_attack_targets.filter(cell => coordinatesKey(cell) !== key)
  return {
    ...memory,
    failed_attack_targets: [
      {
        x: coords.x,
        y: coords.y,
      },
      ...without,
    ].slice(0, max_entries),
  }
}

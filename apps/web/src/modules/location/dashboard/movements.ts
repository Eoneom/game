import { Coordinates, MovementKind } from '@eoneom/api-client'

export type LocationMovementGroup = 'outgoing' | 'returning' | 'convoy'

interface ClassifiableMovement {
  kind: MovementKind
  origin: Coordinates
  destination: Coordinates
}

interface ClassifiedLocationMovements<T> {
  outgoing: T[]
  returning: T[]
  convoys: T[]
  /** Every movement concerning this location, with its group. */
  rows: { movement: T, group: LocationMovementGroup }[]
}

const sameCell = (a: Coordinates, b: Coordinates): boolean => a.x === b.x && a.y === b.y

/**
 * Own movements (player-wide list) that concern one location, grouped by the server's `kind` (slice 045):
 * **Convois** = convoys leaving or reaching it; **Retours** = returns reaching it; **Sortants** = outgoing
 * movements leaving it (attacks, spies, transports, reinforcements, explorations, rebases away).
 * Anything else (movements of other locations, own outgoing movements arriving from another location) is ignored.
 */
export const classifyLocationMovements = <T extends ClassifiableMovement>({
  movements,
  coordinates,
}: {
  movements: readonly T[]
  coordinates: Coordinates
}): ClassifiedLocationMovements<T> => {
  const result: ClassifiedLocationMovements<T> = { outgoing: [], returning: [], convoys: [], rows: [] }

  for (const movement of movements) {
    const from_here = sameCell(movement.origin, coordinates)
    const to_here = sameCell(movement.destination, coordinates)

    if (movement.kind === MovementKind.CONVOY) {
      if (from_here || to_here) {
        result.convoys.push(movement)
        result.rows.push({ movement, group: 'convoy' })
      }
    } else if (movement.kind === MovementKind.RETURN) {
      if (to_here) {
        result.returning.push(movement)
        result.rows.push({ movement, group: 'returning' })
      }
    } else if (from_here) {
      result.outgoing.push(movement)
      result.rows.push({ movement, group: 'outgoing' })
    }
  }

  return result
}

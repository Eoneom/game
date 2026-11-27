/** Defense points still free once existing defenses, the active batch and waiting rows are counted. */
export const freeDefensePoints = (capacity: { total: number, used: number, queued: number }): number =>
  Math.max(0, capacity.total - capacity.used - capacity.queued)

/** Largest batch of a defense type that fits in the remaining capacity. */
export const maxBuildableCount = ({
  capacity,
  points,
}: {
  capacity: { total: number, used: number, queued: number }
  points: number
}): number => (points > 0 ? Math.floor(freeDefensePoints(capacity) / points) : 0)

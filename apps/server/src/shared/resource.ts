export interface Resource {
  plastic: number
  mushroom: number
  plasma: number
  /** Currency (slice 035): produced by the water purifier in cities only, unlimited storage. */
  water: number
}

/** Plastic/mushroom warehouse caps — plasma has unlimited storage. */
export interface WarehouseCapacity {
  plastic: number
  mushroom: number
  /** Absent = unlimited (cities); outposts set 0 since they do not store water (slice 035). */
  water?: number
}

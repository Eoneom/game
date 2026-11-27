export interface Resource {
  plastic: number
  mushroom: number
  plasma: number
  /** Currency (slice 035, FR "eau pure"): produced in cities only, unlimited storage. */
  water: number
}

/** Plastic/mushroom warehouse caps only — plasma has unlimited storage. */
export interface WarehouseCapacity {
  plastic: number
  mushroom: number
}

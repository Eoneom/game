export interface Resource {
  plastic: number
  mushroom: number
  plasma: number
}

/** Plastic/mushroom warehouse caps only — plasma has unlimited storage. */
export interface WarehouseCapacity {
  plastic: number
  mushroom: number
}

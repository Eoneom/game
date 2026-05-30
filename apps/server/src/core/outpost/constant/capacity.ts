export interface OutpostCapacity {
  base: number
  multiplier: number
}

export const outpost_capacity: {
  plastic: OutpostCapacity
  mushroom: OutpostCapacity
} = {
  plastic: {
    base: 2000,
    multiplier: 1.4
  },
  mushroom: {
    base: 1500,
    multiplier: 1.4
  }
}

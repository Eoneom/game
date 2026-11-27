import { Resource } from '#shared/resource'

interface ShelterCapacity {
  base: number
  multiplier: number
}

/** Fixed amount of each resource an `underground_shelter` level protects from loot (slice 028). */
export const underground_shelter_capacity: Record<keyof Resource, ShelterCapacity> = {
  plastic: {
    base: 2000,
    multiplier: 1.6
  },
  mushroom: {
    base: 1500,
    multiplier: 1.6
  },
  plasma: {
    base: 200,
    multiplier: 1.6
  }
}

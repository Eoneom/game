import { City } from '#types'

export const hasEnoughResources = ({
  city,
  cost
}: {
  city: City | null
  cost: {
    plastic: number
    mushroom: number
    plasma?: number
  }
}): boolean => {
  if (!city) {
    return false
  }

  return city.plastic >= cost.plastic &&
    city.mushroom >= cost.mushroom &&
    city.plasma >= (cost.plasma ?? 0)
}

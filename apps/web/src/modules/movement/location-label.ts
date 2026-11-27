import { useMemo } from 'react'
import { Coordinates } from '@eoneom/api-client'

import { formatCoordinates } from '#helpers/transform'
import { useListCities } from '#city/hooks'
import { useListOutposts } from '#outpost/hooks'
import { useMyAlliance } from '#alliance/hooks'

/** Places the movements page can name (slice 045). */
export interface LocationDirectory {
  cities: { id: string; name: string; coordinates: Coordinates }[]
  outposts: { id: string; coordinates: Coordinates }[]
  /** Cities of the other members of the player's alliance. */
  allied_cities: { tag: string; name: string; coordinates: Coordinates }[]
}

const at = (coordinates: Coordinates) => (entry: { coordinates: Coordinates }) =>
  entry.coordinates.x === coordinates.x && entry.coordinates.y === coordinates.y

/** « Alpha (3.4) », « Avant-poste (5.6) », « [TAG] Bastion (7.8) », else « 9.9 ». */
export const formatLocationLabel = (coordinates: Coordinates, directory: LocationDirectory): string => {
  const where = formatCoordinates(coordinates)
  const city = directory.cities.find(at(coordinates))
  if (city) return `${city.name} (${where})`
  if (directory.outposts.some(at(coordinates))) return `Avant-poste (${where})`
  const allied = directory.allied_cities.find(at(coordinates))
  if (allied) return `[${allied.tag}] ${allied.name} (${where})`
  return where
}

/** Own cities (`GET /city` coordinates), own outposts and allied cities, from the shared caches. */
export const useLocationDirectory = (): LocationDirectory => {
  const { data: cities } = useListCities()
  const { data: outposts } = useListOutposts()
  const { data: myAlliance } = useMyAlliance()

  return useMemo(() => {
    const alliance = myAlliance?.alliance
    return {
      cities: (cities?.cities ?? []).map(({ id, name, coordinates }) => ({ id, name, coordinates })),
      outposts: (outposts?.outposts ?? []).map(({ id, coordinates }) => ({ id, coordinates })),
      allied_cities: alliance
        ? alliance.members
          .filter(member => member.player_id !== myAlliance.viewer_player_id)
          .flatMap(member => member.cities.map(city => ({
            tag: alliance.tag,
            name: city.name,
            coordinates: city.coordinates,
          })))
        : [],
    }
  }, [ cities, outposts, myAlliance ])
}

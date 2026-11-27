import { Factory } from '#adapter/factory'
import { Coordinates } from '#core/world/value/coordinates'

export type AllianceMemberCity = {
  id: string
  name: string
  coordinates: Coordinates
}

/** The player's cities with their coordinates (member list, slice 033). */
export async function listCitiesWithCoordinates(player_id: string): Promise<AllianceMemberCity[]> {
  const repository = Factory.getRepository()
  const cities = await repository.city.list({ player_id })
  const cells = await Promise.all(cities.map(city => repository.cell.getById(city.cell_id)))
  return cities.map((city, index) => ({
    id: city.id,
    name: city.name,
    coordinates: cells[index].coordinates,
  }))
}

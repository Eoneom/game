import { GenericQuery } from '#query/generic'
import { getPlayerDisplayNames } from '#query/alliance/display-names'
import { TroopService } from '#core/troop/service'
import { TroopCount } from '#core/troop/type'
import { Coordinates } from '#core/world/value/coordinates'

interface TroopReinforcementAbroadQueryRequest {
  player_id: string
}

type ReinforcementAbroad = {
  city: { id: string, name: string, coordinates: Coordinates }
  host: { id: string, name: string }
  troops: TroopCount[]
}

/** The caller's troops stationed in allied cities, per host city (slice 033). */
export class TroopReinforcementAbroadQuery extends GenericQuery<TroopReinforcementAbroadQueryRequest, ReinforcementAbroad[]> {
  constructor() {
    super({ name: 'troop:reinforcement:abroad' })
  }

  protected async get({ player_id }: TroopReinforcementAbroadQueryRequest): Promise<ReinforcementAbroad[]> {
    const troops = await this.repository.troop.listStationedAbroad({ player_id })
    const cell_ids = [ ...new Set(troops.map(troop => troop.cell_id as string)) ]
    const locations = await Promise.all(cell_ids.map(async cell_id => {
      const [
        city,
        cell
      ] = await Promise.all([
        this.repository.city.searchByCell({ cell_id }),
        this.repository.cell.getById(cell_id),
      ])
      return {
        cell_id,
        city,
        coordinates: cell.coordinates
      }
    }))
    const names = await getPlayerDisplayNames(locations.flatMap(location => location.city ? [ location.city.player_id ] : []))

    return locations.flatMap(({
      cell_id, city, coordinates
    }): ReinforcementAbroad[] => {
      if (!city) {
        return []
      }
      return [
        {
          city: {
            id: city.id,
            name: city.name,
            coordinates,
          },
          host: {
            id: city.player_id,
            name: names.get(city.player_id) ?? '',
          },
          troops: TroopService.sortTroops({ troops: troops.filter(troop => troop.cell_id === cell_id) })
            .map(troop => ({
              code: troop.code,
              count: troop.count,
            })),
        }
      ]
    })
  }
}

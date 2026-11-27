import { GenericQuery } from '#query/generic'
import { getPlayerDisplayNames } from '#query/alliance/display-names'
import { CityError } from '#core/city/error'
import { TroopService } from '#core/troop/service'
import { TroopCount } from '#core/troop/type'
import { isId } from '#shared/identification'

interface TroopReinforcementListQueryRequest {
  player_id: string
  city_id: string
}

type StationedReinforcement = {
  owner: { id: string, name: string }
  troops: TroopCount[]
}

/** Allied troops stationed in one of the caller's cities, per owner (read only for the host, slice 033). */
export class TroopReinforcementListQuery extends GenericQuery<TroopReinforcementListQueryRequest, StationedReinforcement[]> {
  constructor() {
    super({ name: 'troop:reinforcement:list' })
  }

  protected async get({
    player_id,
    city_id
  }: TroopReinforcementListQueryRequest): Promise<StationedReinforcement[]> {
    if (!isId(city_id)) {
      throw new Error(CityError.NOT_FOUND)
    }
    const city = await this.repository.city.get(city_id)
    if (!city.isOwnedBy(player_id)) {
      throw new Error(CityError.NOT_OWNER)
    }

    const troops = await this.repository.troop.listReinforcementsInCell({
      cell_id: city.cell_id,
      host_player_id: player_id,
    })
    const owner_ids = [ ...new Set(troops.map(troop => troop.player_id)) ]
    const names = await getPlayerDisplayNames(owner_ids)

    return owner_ids.map(owner_id => ({
      owner: {
        id: owner_id,
        name: names.get(owner_id) ?? '',
      },
      troops: TroopService.sortTroops({ troops: troops.filter(troop => troop.player_id === owner_id) })
        .map(troop => ({
          code: troop.code,
          count: troop.count,
        })),
    }))
  }
}

import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { AppService } from '#app/service'
import { BuildingService } from '#core/building/service'
import { CityEntity } from '#core/city/entity'
import { CityError } from '#core/city/error'
import { CityService } from '#core/city/service'
import { OutpostType } from '#core/outpost/constant/type'
import { OutpostError } from '#core/outpost/error'
import { TroopRole } from '#core/troop/constant/role'
import { TroopService } from '#core/troop/service'

export interface CitySettleParams {
  outpost_id: string
  player_id: string
  city_name: string
}

export interface CitySettleResult {
  city_id: string
}

export async function citySettle({
  outpost_id,
  player_id,
  city_name,
}: CitySettleParams): Promise<CitySettleResult> {
  return runCommand('city:settle', async () => {
    const repository = Factory.getRepository()

    const [
      outpost,
      existing_cities_count,
      does_city_exist,
    ] = await Promise.all([
      repository.outpost.getById(outpost_id),
      repository.city.count({ player_id }),
      repository.city.exist(city_name),
    ])

    if (CityService.isLimitReached(existing_cities_count)) {
      throw new Error(CityError.LIMIT_REACHED)
    }

    if (!outpost.isOwnedBy(player_id)) {
      throw new Error(OutpostError.NOT_OWNER)
    }

    if (outpost.type === OutpostType.PERMANENT) {
      throw new Error(CityError.CANNOT_SETTLE_ON_PERMANENT_OUTPOST)
    }

    if (does_city_exist) {
      throw new Error(CityError.ALREADY_EXISTS)
    }

    const [
      cell,
      troops
    ] = await Promise.all([
      repository.cell.getById(outpost.cell_id),
      repository.troop.listInCell({
        cell_id: outpost.cell_id,
        player_id
      }),
    ])

    const founder_troop = TroopService.findByRole({
      troops,
      role: TroopRole.FOUNDER
    })
    if (!founder_troop) {
      throw new Error(CityError.NO_SETTLER_AVAILABLE)
    }

    const have_enough_founder = TroopService.haveEnoughTroops({
      origin_troops: [ founder_troop ],
      move_troops: [
        {
          code: founder_troop.code,
          count: 1
        }
      ]
    })
    if (!have_enough_founder) {
      throw new Error(CityError.NO_SETTLER_AVAILABLE)
    }

    const [
      exploration,
      cells_around_city
    ] = await Promise.all([
      repository.exploration.get({ player_id }),
      AppService.getCellsAround({ coordinates: cell.coordinates }),
    ])

    const city = CityEntity.initCity({
      player_id,
      name: city_name,
      cell_id: cell.id
    })

    const buildings = BuildingService.init({ city_id: city.id })

    const settler_troop_to_update = founder_troop.removeCount(1)
    const exploration_to_update = exploration.exploreCells([
      ...cells_around_city.map(c => c.id),
      cell.id
    ])

    await repository.city.create(city)
    await Promise.all([
      repository.outpost.delete(outpost.id),
      ...buildings.map(building => repository.building.create(building)),
      repository.troop.updateOne(settler_troop_to_update),
      repository.exploration.updateOne(exploration_to_update)
    ])

    return { city_id: city.id }
  })
}

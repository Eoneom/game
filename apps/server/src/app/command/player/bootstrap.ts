import { Factory } from '#adapter/factory'
import { AppService } from '#app/service'
import { BuildingService } from '#core/building/service'
import { CityService } from '#core/city/service'
import { PlayerService } from '#core/player/service'
import { TechnologyService } from '#core/technology/service'
import { TroopService } from '#core/troop/service'
import { ExplorationEntity } from '#core/world/exploration/entity'
import { ResourcesService } from '#core/resources/service'
import { now } from '#shared/time'

export interface BootstrapPlayerParams {
  city_name: string
  player_name: string
  faction_code: string
  system_controlled: boolean
}

export interface BootstrapPlayerResult {
  player_id: string
  city_id: string
}

export async function bootstrapPlayer({
  player_name,
  city_name,
  faction_code,
  system_controlled,
}: BootstrapPlayerParams): Promise<BootstrapPlayerResult> {
  const repository = Factory.getRepository()

  const [
    does_player_exist,
    does_city_exist,
    city_first_cell,
  ] = await Promise.all([
    repository.player.exist(player_name),
    repository.city.exist(city_name),
    AppService.selectCityFirstCell(),
  ])

  const cells_around_city = await AppService.getCellsAround({ coordinates: city_first_cell.coordinates })

  const player = PlayerService.init({
    name: player_name,
    faction_code,
    does_player_exist,
    system_controlled
  })
  const city = CityService.settle({
    name: city_name,
    player_id: player.id,
    cell_id: city_first_cell.id,
    does_city_exist
  })
  const buildings = BuildingService.init({ city_id: city.id })
  const technologies = TechnologyService.init({ player_id: player.id })
  const gather_at = now()
  const initial_stock = await repository.resource_stock.getByCellId({ cell_id: city_first_cell.id })
  const stock_for_first_city = initial_stock.withState(ResourcesService.firstCityCanonicalResourceStockState({ gather_at }))
  const troops = TroopService.init({
    player_id: player.id,
    cell_id: city_first_cell.id,
    faction_code: player.faction_code
  })
  const exploration = ExplorationEntity.init({
    player_id: player.id,
    cell_ids: [
      ...cells_around_city.map(c => c.id),
      city_first_cell.id
    ]
  })

  await repository.player.create(player)
  await repository.city.create(city)
  await Promise.all([
    ...buildings.map(building => repository.building.create(building)),
    ...technologies.map(technology => repository.technology.create(technology)),
    repository.resource_stock.updateOne(stock_for_first_city),
    ...troops.map(troop => repository.troop.create(troop)),
    repository.exploration.create(exploration)
  ])

  return {
    player_id: player.id,
    city_id: city.id
  }
}

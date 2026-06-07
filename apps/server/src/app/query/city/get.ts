import { GenericQuery } from '#query/generic'
import { AppService } from '#app/service'
import { Resource } from '#shared/resource'
import { now } from '#shared/time'
import { CellEntity } from '#core/world/cell/entity'
import { CityEntity } from '#core/city/entity'
import { CityError } from '#core/city/error'
import { ResourcesService } from '#core/resources/service'
import { ResourceStockEntity } from '#core/resources/resource-stock/entity'
import { BuildingCode } from '#core/building/constant/code'

export interface CityGetQueryRequest {
  city_id: string
  player_id: string
}

export interface CityGetQueryResponse {
  city: CityEntity
  earnings_per_second: Resource
  pre_cell_earnings_per_second: Resource
  cell_resource_coefficient: Resource
  maximum_building_levels: number
  building_levels_used: number
  cell: CellEntity
  resource_stock: ResourceStockEntity
  warehouses_capacity: Resource
  warehouse_space_remaining: Resource
  warehouse_full_in_seconds: Resource
  energy: number
  pre_cell_energy: number
  neutral_photovoltaic_energy: number
  cell_solar_coefficient: number
  photovoltaic_optimization_level: number
  energy_consumption: number
  production_energy_ratio: number
}

export class CityGetQuery extends GenericQuery<CityGetQueryRequest, CityGetQueryResponse> {
  constructor() {
    super({ name: 'city:get' })
  }

  protected async get({
    city_id,
    player_id
  }: CityGetQueryRequest): Promise<CityGetQueryResponse> {
    const city = await this.repository.city.get(city_id)
    if (!city.isOwnedBy(player_id)) {
      throw new Error(CityError.NOT_OWNER)
    }

    const [
      production,
      cell,
      maximum_building_levels,
      warehouses_capacity,
      building_levels_used,
      solar_panel_level,
      energy_consumption_breakdown,
    ] = await Promise.all([
      AppService.getCityProductionBreakdown({
        city_id: city.id,
        player_id
      }),
      this.repository.cell.getCityCell({ city_id: city.id }),
      AppService.getCityMaximumBuildingLevels({ city_id: city.id }),
      AppService.getCityWarehousesCapacity({ city_id: city.id }),
      this.repository.building.getTotalLevels({ city_id: city.id }),
      this.repository.building.getLevel({
        city_id: city.id,
        code: BuildingCode.SOLAR_PANEL,
      }),
      AppService.getCityEnergyConsumptionBreakdown({
        city_id: city.id,
        player_id
      }),
    ])

    const energy_breakdown = await AppService.getCityEnergyBreakdown({
      city_id: city.id,
      player_id,
      solar_panel_level,
    })

    const stock_row = await this.repository.resource_stock.getByCellId({ cell_id: cell.id })

    AppService.assertResourceStockMatchesCityCell({
      city,
      city_cell: cell,
      stock: stock_row
    })

    const { stock: stock_as_of_now } = stock_row.gather({
      gather_at_time: now(),
      earnings_per_second: production.earnings_per_second,
      warehouses_capacity
    })

    const warehouse_space_remaining: Resource = {
      plastic: Math.max(0, warehouses_capacity.plastic - stock_as_of_now.plastic),
      mushroom: Math.max(0, warehouses_capacity.mushroom - stock_as_of_now.mushroom)
    }

    const warehouse_full_in_seconds: Resource = {
      plastic: ResourcesService.computeWarehouseFullInSeconds({
        space_remaining: warehouses_capacity.plastic - stock_as_of_now.plastic,
        earnings_per_second: production.earnings_per_second.plastic
      }),
      mushroom: ResourcesService.computeWarehouseFullInSeconds({
        space_remaining: warehouses_capacity.mushroom - stock_as_of_now.mushroom,
        earnings_per_second: production.earnings_per_second.mushroom
      })
    }

    return {
      city,
      earnings_per_second: production.earnings_per_second,
      pre_cell_earnings_per_second: production.pre_cell_earnings_per_second,
      cell_resource_coefficient: production.cell_resource_coefficient,
      maximum_building_levels,
      building_levels_used,
      cell,
      resource_stock: stock_as_of_now,
      warehouses_capacity,
      warehouse_space_remaining,
      warehouse_full_in_seconds,
      energy: energy_breakdown.energy,
      pre_cell_energy: energy_breakdown.pre_cell_energy,
      neutral_photovoltaic_energy: energy_breakdown.neutral_photovoltaic_energy,
      cell_solar_coefficient: energy_breakdown.cell_solar_coefficient,
      photovoltaic_optimization_level: energy_breakdown.photovoltaic_optimization_level,
      energy_consumption: energy_consumption_breakdown.energy_consumption,
      production_energy_ratio: energy_consumption_breakdown.production_energy_ratio,
    }
  }
}

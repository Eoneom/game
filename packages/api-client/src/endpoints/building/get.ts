import { BuildingCode } from '@server-core/building/constant/code'
import { GenericResponse } from '../../response'
import { Requirement } from '../shared/requirement'

export interface BuildingGetRequest {
  city_id: string
  building_code: BuildingCode
}

type BaseBuilding = {
  code: BuildingCode
  level: number
  upgrade_cost: {
    plastic: number
    mushroom: number
    duration: number
  }
  requirement: Requirement
  metadata: Record<string, unknown>
} & (
  | { upgrade_at: number; upgrade_started_at: number }
  | { upgrade_at?: undefined; upgrade_started_at?: undefined }
)

export type WarehouseBuilding = BaseBuilding & { metadata: { current_capacity: number, next_capacity: number } }
export const isWarehouseBuilding = (b: BaseBuilding): b is WarehouseBuilding => {
  return b.code === BuildingCode.PLASTIC_WAREHOUSE || b.code === BuildingCode.MUSHROOM_WAREHOUSE
}

export type ProductionBuilding = BaseBuilding & {
  metadata: {
    current_production: number
    next_production: number
    current_consumption: number
    next_consumption: number
    energy_upgrade_warning: boolean
  }
}
export const isProductionBuilding = (b: BaseBuilding): b is ProductionBuilding => {
  return b.code === BuildingCode.RECYCLING_PLANT ||
    b.code === BuildingCode.MUSHROOM_FARM ||
    b.code === BuildingCode.CENTRAL_INDUCTOR
}

export type ConsumingBuilding = BaseBuilding & {
  metadata: {
    current_consumption: number
    next_consumption: number
    energy_upgrade_warning: boolean
  }
}
export const isConsumingBuilding = (b: BaseBuilding): b is ConsumingBuilding => {
  return b.code === BuildingCode.RESEARCH_LAB || b.code === BuildingCode.CLONING_FACTORY
}

export type EnergyBuilding = BaseBuilding & { metadata: { current_energy: number, next_energy: number } }
export const isEnergyBuilding = (b: BaseBuilding): b is EnergyBuilding => {
  return b.code === BuildingCode.SOLAR_PANEL
}

export type BuildingGetDataResponse = WarehouseBuilding | ProductionBuilding | EnergyBuilding | ConsumingBuilding | BaseBuilding

export type BuildingGetResponse = GenericResponse<BuildingGetDataResponse>

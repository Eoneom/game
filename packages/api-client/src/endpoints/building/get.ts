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
    plasma: number
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

export type CommandCenterBuilding = BaseBuilding & {
  metadata: {
    current_consumption: number
    next_consumption: number
    energy_upgrade_warning: boolean
    /** Movements this city's command center adds to the player cap (its level). */
    current_movement_bonus: number
    next_movement_bonus: number
    /** Player-wide cap: `5 + Σ command_center level`. */
    movement_limit: number
    /** Waiting recruitment slots in this city (0 at level 0). */
    recruit_queue_limit: number
  }
}
export const isCommandCenterBuilding = (b: BaseBuilding): b is CommandCenterBuilding => {
  return b.code === BuildingCode.COMMAND_CENTER
}

type ShelteredResources = {
  plastic: number
  mushroom: number
  plasma: number
}

export type ShelterBuilding = BaseBuilding & {
  metadata: {
    current_sheltered: ShelteredResources
    next_sheltered: ShelteredResources
  }
}
export const isShelterBuilding = (b: BaseBuilding): b is ShelterBuilding => {
  return b.code === BuildingCode.UNDERGROUND_SHELTER
}

export type EnergyBuilding = BaseBuilding & { metadata: { current_energy: number, next_energy: number } }
export const isEnergyBuilding = (b: BaseBuilding): b is EnergyBuilding => {
  return b.code === BuildingCode.SOLAR_PANEL
}

export type BuildingGetDataResponse = WarehouseBuilding | ProductionBuilding | EnergyBuilding | ConsumingBuilding | CommandCenterBuilding | ShelterBuilding | BaseBuilding

export type BuildingGetResponse = GenericResponse<BuildingGetDataResponse>

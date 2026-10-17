import { BuildingCode } from '@server-core/building/constant/code'
import { OutpostType } from '@server-core/outpost/constant/type'
import { TechnologyCode } from '@server-core/technology/constant/code'
import { GenericResponse } from '../../response'
import { Coordinates } from '../shared/coordinates'
import { Resource, WarehouseCapacity } from '../shared/resource'

export type AdminSystemPlayerCitySummary = {
  id: string
  name: string
  coordinates: Coordinates
  resources: Resource
  earnings_per_second: Resource
  energy: number
  energy_consumption: number
  production_energy_ratio: number
  warehouses_capacity: WarehouseCapacity
  warehouse_space_remaining: WarehouseCapacity
}

export type AdminSystemPlayerOutpostSummary = {
  id: string
  type: OutpostType
  coordinates: Coordinates
  resources: Resource
  earnings_per_second: Resource
  warehouses_capacity: WarehouseCapacity
  warehouse_space_remaining: WarehouseCapacity
}

export type AdminSystemPlayerBuildingLevel = {
  code: BuildingCode
  level: number
}

export type AdminSystemPlayerCityBuildings = {
  city_id: string
  city_name: string
  buildings: AdminSystemPlayerBuildingLevel[]
}

export type AdminSystemPlayerTechnologyLevel = {
  code: TechnologyCode
  level: number
}

export type AdminSystemPlayerStatsSnapshot = {
  player_id: string
  player_name: string
  cities: AdminSystemPlayerCitySummary[]
  outposts: AdminSystemPlayerOutpostSummary[]
  technologies: AdminSystemPlayerTechnologyLevel[]
  buildings_by_city: AdminSystemPlayerCityBuildings[]
  updated_at: number
}

export interface AdminSystemPlayerStatsDataResponse {
  players: AdminSystemPlayerStatsSnapshot[]
}

export type AdminSystemPlayerStatsResponse = GenericResponse<AdminSystemPlayerStatsDataResponse>

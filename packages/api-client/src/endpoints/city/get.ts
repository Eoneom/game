import { GenericResponse } from '../../response'
import { Coordinates } from '../shared/coordinates'

export interface CityGetRequest {
  city_id: string
}

export interface CityGetDataResponse {
  id: string
  name: string
  plastic: number
  mushroom: number
  maximum_building_levels: number
  building_levels_used: number
  coordinates: Coordinates
  earnings_per_second: {
    plastic: number
    mushroom: number
  }
  pre_cell_earnings_per_second: {
    plastic: number
    mushroom: number
  }
  cell_resource_coefficient: {
    plastic: number
    mushroom: number
  }
  warehouses_capacity: {
    plastic: number
    mushroom: number
  }
  warehouse_space_remaining: {
    plastic: number
    mushroom: number
  }
  warehouse_full_in_seconds: {
    plastic: number
    mushroom: number
  }
  energy: number
  pre_cell_energy: number
  cell_solar_coefficient: number
}

export type CityGetResponse = GenericResponse<CityGetDataResponse>

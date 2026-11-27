import { GenericResponse } from '../../response'
import { Coordinates } from '../shared/coordinates'

export interface CityListDataResponse {
  cities: {
    id: string
    name: string
    coordinates: Coordinates
  }[]
  count_limit: number
}

export type CityListResponse = GenericResponse<CityListDataResponse>

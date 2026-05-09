import { GenericResponse } from '../../response'
import { Coordinates } from '../shared/coordinates'
import { OutpostType } from '@server-core/outpost/constant/type'

export interface OutpostGetRequest {
  outpost_id: string
}

export interface OutpostGetDataResponse {
  id: string
  coordinates: Coordinates
  type: OutpostType
  plastic: number
  mushroom: number
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
}

export type OutpostGetResponse = GenericResponse<OutpostGetDataResponse>

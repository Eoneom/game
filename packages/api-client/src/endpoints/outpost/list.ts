import { GenericResponse } from '../../response'
import { Coordinates } from '../shared/coordinates'
import { OutpostType } from '@server-core/outpost/constant/type'

export interface OutpostListDataResponse {
  outposts: {
    id: string
    coordinates: Coordinates
    type: OutpostType
    plastic: number
    mushroom: number
  }[]
  count_limit: number
}

export type OutpostListResponse = GenericResponse<OutpostListDataResponse>

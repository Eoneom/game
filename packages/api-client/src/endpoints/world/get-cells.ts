import { GenericResponse } from '../../response'

import { CellType } from '@server-core/world/value/cell-type'

export interface WorldGetCellsRequest {
  min_x: number
  max_x: number
  min_y: number
  max_y: number
}

export interface WorldGetCellsDataResponse {
  cells: {
    coordinates: {
      x: number
      y: number
    }
    characteristic?: {
      type: CellType
      resource_coefficient: {
        plastic: number
        mushroom: number
      }
      solar_coefficient: number
    }
  }[]
}

export type WorldGetCellsResponse = GenericResponse<WorldGetCellsDataResponse>

import { GenericResponse } from '../../response'

import { CellType } from '@server-core/world/value/cell-type'

export interface WorldGetSectorRequest {
  sector: number
}

export interface WorldGetSectorDataResponse {
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

export type WorldGetSectorResponse = GenericResponse<WorldGetSectorDataResponse>

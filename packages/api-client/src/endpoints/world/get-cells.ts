import { GenericResponse } from '../../response'

import { FactionCode } from '@server-core/faction/constant/code'
import { OutpostType } from '@server-core/outpost/constant/type'
import { CellType } from '@server-core/world/value/cell-type'

import { Coordinates } from '../shared/coordinates'

export interface WorldGetCellsRequest {
  min_x: number
  max_x: number
  min_y: number
  max_y: number
}

export interface WorldMapCityMarker {
  id: string
  name: string
  player_id: string
  faction_code: FactionCode
  coordinates: Coordinates
}

export interface WorldMapOutpostMarker {
  id: string
  player_id: string
  faction_code: FactionCode
  type: OutpostType
  coordinates: Coordinates
}

export interface WorldGetCellsDataResponse {
  viewer: {
    player_id: string
    faction_code: FactionCode
  }
  cells: {
    coordinates: Coordinates
    type: CellType
    explored: boolean
    characteristic?: {
      resource_coefficient: {
        plastic: number
        mushroom: number
      }
      solar_coefficient: number
    }
  }[]
  settlements: {
    cities: WorldMapCityMarker[]
    outposts: WorldMapOutpostMarker[]
  }
}

export type WorldGetCellsResponse = GenericResponse<WorldGetCellsDataResponse>

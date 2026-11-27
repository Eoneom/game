import { BuildingCode } from '@server-core/building/constant/code'
import { GenericResponse } from '../../response'
import { Requirement } from '../shared/requirement'

export interface BuildingListRequest {
  city_id: string
}

type BuildingListEntryBase = {
  id: string
  code: BuildingCode
  level: number
  /** Cost of level + 1 (same as `GET /city/:city_id/building/:code`). */
  upgrade_cost: {
    plastic: number
    mushroom: number
    plasma: number
    duration: number
  }
  requirement: Requirement
}

export type BuildingListEntry =
  | (BuildingListEntryBase & {
      upgrade_at: number
      upgrade_started_at: number
    })
  | BuildingListEntryBase

export interface BuildingUpgradeQueueEntry {
  id: string
  building_code: BuildingCode
  duration_seconds: number
  start_at: number
  finish_at: number
}

export interface BuildingListDataResponse {
  buildings: BuildingListEntry[]
  upgrade_queue: BuildingUpgradeQueueEntry[]
}

export type BuildingListResponse = GenericResponse<BuildingListDataResponse>

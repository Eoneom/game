import { BuildingCode } from '@server-core/building/constant/code'
import { TechnologyCode } from '@server-core/technology/constant/code'
import { TroopCode } from '@server-core/troop/constant/code'
import { GenericResponse } from '../../response'

export interface LocationActivityBuilding {
  code: BuildingCode
  level: number
  upgrade_at: number
  upgrade_started_at: number
}

export interface LocationActivityResearch {
  code: TechnologyCode
  level: number
  research_at: number
  research_started_at: number
}

export interface LocationActivityRecruitment {
  code: TroopCode
  remaining_count: number
  finish_at: number
  started_at: number
}

export interface LocationActivityMovementSummary {
  count: number
  next_arrive_at: number | null
}

export interface LocationActivityDataResponse {
  building: LocationActivityBuilding | null
  building_queue_depth: number
  research: LocationActivityResearch | null
  recruitment: LocationActivityRecruitment | null
  movements: LocationActivityMovementSummary
}

export type LocationActivityResponse = GenericResponse<LocationActivityDataResponse>

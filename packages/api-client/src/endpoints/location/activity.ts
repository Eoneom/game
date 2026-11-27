import { BuildingCode } from '@server-core/building/constant/code'
import { DefenseCode } from '@server-core/defense/constant/code'
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
  /** City running the research (research is player-wide, slice 041). */
  city_id: string
  city_name: string
}

export interface LocationActivityRecruitment {
  code: TroopCode
  remaining_count: number
  finish_at: number
  started_at: number
}

/** Running defense build batch of a city (slice 041). */
export interface LocationActivityFortification {
  code: DefenseCode
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
  /** Player-wide research queue length. */
  research_queue_depth: number
  recruitment: LocationActivityRecruitment | null
  /** 0 for an outpost. */
  recruitment_queue_depth: number
  /** Always null for an outpost. */
  fortification: LocationActivityFortification | null
  /** 0 for an outpost. */
  fortification_queue_depth: number
  /** Enceinte level >= 1; always false for an outpost. */
  fortification_available: boolean
  movements: LocationActivityMovementSummary
}

export type LocationActivityResponse = GenericResponse<LocationActivityDataResponse>

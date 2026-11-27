import { TechnologyCode } from '@server-core/technology/constant/code'
import { GenericResponse } from '../../response'
import { Requirement } from '../shared/requirement'

export interface TechnologyListRequest {
  /** Prices `research_cost` with this city's research lab (slice 043). */
  city_id?: string
}

type TechnologyListEntryBase = {
  id: string
  code: TechnologyCode
  level: number
  /** Level-scaled requirement of level + 1 (`RequirementService.getTechnologyRequirement`). */
  requirement: Requirement
  /** Present when `city_id` is given: cost of level + 1 with that city's research lab. */
  research_cost?: {
    plastic: number
    mushroom: number
    plasma: number
    duration: number
  }
}

export type TechnologyListEntry =
  | (TechnologyListEntryBase & {
      research_at: number
      research_started_at: number
    })
  | TechnologyListEntryBase

export interface TechnologyResearchQueueEntry {
  id: string
  technology_code: TechnologyCode
  city_id: string
  city_name: string
  duration_seconds: number
  start_at: number
  finish_at: number
}

export interface TechnologyListDataResponse {
  technologies: TechnologyListEntry[]
  research_queue: TechnologyResearchQueueEntry[]
}

export type TechnologyListResponse = GenericResponse<TechnologyListDataResponse>

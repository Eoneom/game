import { TechnologyCode } from '@server-core/technology/constant/code'
import { GenericResponse } from '../../response'

export type TechnologyListEntry =
  | {
      id: string
      code: TechnologyCode
      level: number
      research_at: number
      research_started_at: number
    }
  | {
      id: string
      code: TechnologyCode
      level: number
    }

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

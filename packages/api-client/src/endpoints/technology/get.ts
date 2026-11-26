import { TechnologyCode } from '@server-core/technology/constant/code'
import { GenericResponse } from '../../response'
import { Requirement } from '../shared/requirement'

export interface TechnologyGetRequest {
  city_id: string
  technology_code: TechnologyCode
}

type TechnologyGetBase = {
  id: string
  code: TechnologyCode
  level: number
  research_cost: {
    plastic: number
    mushroom: number
    plasma: number
    duration: number
  }
  requirement: Requirement
}

export type TechnologyGetDataResponse =
  | (TechnologyGetBase & {
      research_at: number
      research_started_at: number
    })
  | TechnologyGetBase

export type TechnologyGetResponse = GenericResponse<TechnologyGetDataResponse>

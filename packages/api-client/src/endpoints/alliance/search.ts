import { GenericResponse } from '../../response'
import { AllianceSummary } from './shared'

export interface AllianceSearchRequest {
  q: string
}

export interface AllianceSearchDataResponse {
  alliances: (AllianceSummary & { member_count: number })[]
}

export type AllianceSearchResponse = GenericResponse<AllianceSearchDataResponse>

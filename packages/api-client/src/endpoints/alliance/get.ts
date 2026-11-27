import { GenericResponse } from '../../response'
import { AllianceDetails } from './shared'

export interface AllianceGetRequest {
  alliance_id: string
}

export interface AllianceGetDataResponse extends AllianceDetails {
  member_count: number
  chef: { id: string, name: string } | null
}

export type AllianceGetResponse = GenericResponse<AllianceGetDataResponse>

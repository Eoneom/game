import { GenericResponse } from '../../response'

export interface AllianceCreateRequest {
  name: string
  tag: string
  description?: string
}

export interface AllianceCreateDataResponse {
  alliance_id: string
}

export type AllianceCreateResponse = GenericResponse<AllianceCreateDataResponse>

export interface AllianceUpdateDescriptionRequest {
  description: string
}

export type AllianceUpdateDescriptionResponse = GenericResponse<void>

export type AllianceDissolveResponse = GenericResponse<void>

export type AllianceLeaveResponse = GenericResponse<void>

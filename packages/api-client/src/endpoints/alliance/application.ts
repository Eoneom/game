import { GenericResponse } from '../../response'
import { AllianceSummary } from './shared'

export interface AllianceApplyRequest {
  alliance_id: string
  message?: string
}

export interface AllianceApplyDataResponse {
  application_id: string
}

export type AllianceApplyResponse = GenericResponse<AllianceApplyDataResponse>

export interface AllianceApplicationRequest {
  application_id: string
}

export type AllianceApplicationActionResponse = GenericResponse<void>

export interface AllianceApplicationListDataResponse {
  /** Pending applications to the caller's alliance (officers and chef only). */
  received: {
    id: string
    player: { id: string, name: string }
    message: string | null
    created_at: number
  }[]
  /** The caller's own pending applications. */
  sent: {
    id: string
    alliance: AllianceSummary
    message: string | null
    created_at: number
  }[]
}

export type AllianceApplicationListResponse = GenericResponse<AllianceApplicationListDataResponse>

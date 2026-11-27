import { GenericResponse } from '../../response'
import { AllianceSummary } from './shared'

export interface AllianceInviteRequest {
  player_name: string
}

export interface AllianceInviteDataResponse {
  invitation_id: string
}

export type AllianceInviteResponse = GenericResponse<AllianceInviteDataResponse>

export interface AllianceAnswerInvitationRequest {
  invitation_id: string
}

export type AllianceAnswerInvitationResponse = GenericResponse<void>

export interface AllianceInvitationListDataResponse {
  invitations: {
    id: string
    alliance: AllianceSummary
    invited_by: { id: string, name: string }
    created_at: number
    expires_at: number
  }[]
}

export type AllianceInvitationListResponse = GenericResponse<AllianceInvitationListDataResponse>

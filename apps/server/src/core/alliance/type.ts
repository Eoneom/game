import { AllianceRole } from '#core/alliance/constant/role'

export type AllianceMember = {
  alliance_id: string
  player_id: string
  role: AllianceRole
  joined_at: number
}

export type AllianceInvitation = {
  id: string
  alliance_id: string
  player_id: string
  invited_by: string
  created_at: number
  expires_at: number
}

export type AllianceApplication = {
  id: string
  alliance_id: string
  player_id: string
  message: string | null
  created_at: number
}

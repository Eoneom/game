import { AllianceRole } from '@server-core/alliance/constant/role'
import { GenericResponse } from '../../response'

export interface AllianceSetRoleRequest {
  player_id: string
  role: AllianceRole.OFFICIER | AllianceRole.MEMBRE
}

export interface AllianceTransferLeadershipRequest {
  player_id: string
}

export interface AllianceKickRequest {
  player_id: string
}

export type AllianceMemberActionResponse = GenericResponse<void>

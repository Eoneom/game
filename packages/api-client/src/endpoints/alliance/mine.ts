import { AllianceRole } from '@server-core/alliance/constant/role'
import { GenericResponse } from '../../response'
import {
  AllianceDetails,
  AllianceMemberItem
} from './shared'

export interface AllianceMineDataResponse {
  /** `null` when the caller has no alliance. */
  alliance: (AllianceDetails & {
    viewer_role: AllianceRole
    members: AllianceMemberItem[]
  }) | null
  /** End of the 24 h cooldown after voluntarily leaving, `null` when it is over. */
  cooldown_until: number | null
  /** The caller, so the client can tell their own row apart. */
  viewer_player_id: string
}

export type AllianceMineResponse = GenericResponse<AllianceMineDataResponse>

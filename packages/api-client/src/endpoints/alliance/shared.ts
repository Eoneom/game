import { AllianceRole } from '@server-core/alliance/constant/role'
import { FactionCode } from '@server-core/faction/constant/code'
import { Coordinates } from '../shared/coordinates'

export interface AllianceSummary {
  id: string
  name: string
  tag: string
}

export interface AllianceMemberItem {
  player_id: string
  name: string
  role: AllianceRole
  joined_at: number
  cities: {
    id: string
    name: string
    coordinates: Coordinates
  }[]
}

export interface AllianceDetails extends AllianceSummary {
  description: string
  faction_code: FactionCode
  created_at: number
}

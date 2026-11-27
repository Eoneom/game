import { GenericResponse } from '../../response'

import { FactionCode } from '@server-core/faction/constant/code'
import { OutpostType } from '@server-core/outpost/constant/type'

import { Coordinates } from '../shared/coordinates'

export interface WorldMarkersRequest {
  min_x: number
  max_x: number
  min_y: number
  max_y: number
}

/** Owner seen from the viewer, first match wins: mine > ally (same alliance) > system > faction (same faction) > enemy. */
export type WorldMarkerRelation = 'mine' | 'ally' | 'faction' | 'enemy' | 'system'

export interface WorldMarkerCity {
  id: string
  name: string
  player_id: string
  owner_name: string
  faction_code: FactionCode
  alliance_tag: string | null
  relation: WorldMarkerRelation
  /** Bucket of the city's total building levels: 1 (0–19), 2 (20–49), 3 (50–79), 4 (≥ 80). */
  size: 1 | 2 | 3 | 4
  coordinates: Coordinates
}

export interface WorldMarkerOutpost {
  id: string
  player_id: string
  owner_name: string
  faction_code: FactionCode
  alliance_tag: string | null
  relation: WorldMarkerRelation
  type: OutpostType
  coordinates: Coordinates
}

/** `GET /world/markers` (slice 044): settlements in bounds (side ≤ 100) with relation and size. */
export interface WorldMarkersDataResponse {
  viewer: { player_id: string, faction_code: FactionCode, alliance_id: string | null }
  cities: WorldMarkerCity[]
  outposts: WorldMarkerOutpost[]
}

export type WorldMarkersResponse = GenericResponse<WorldMarkersDataResponse>

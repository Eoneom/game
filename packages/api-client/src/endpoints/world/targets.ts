import { GenericResponse } from '../../response'

import { FactionCode } from '@server-core/faction/constant/code'
import { OutpostType } from '@server-core/outpost/constant/type'

import { Coordinates } from '../shared/coordinates'

/** Latest successful spy report the viewer holds on a cell, with a display-only strength estimate (slice 044). */
export interface WorldTargetIntel {
  report_id: string
  recorded_at: number
  tier: number
  troop_count: number
  /** False on a city spied at tier 1: defenses unknown, the estimate is a lower bound (« ≥ »). */
  defenses_known: boolean
  estimated: { attack: number, life: number }
}

export interface WorldTarget {
  kind: 'city' | 'outpost'
  id: string
  category: 'target' | 'threat'
  relation: 'system' | 'enemy'
  /** City name; null for outposts. */
  name: string | null
  outpost_type: OutpostType | null
  owner_name: string
  alliance_tag: string | null
  faction_code: FactionCode
  /** Cities only. */
  size: 1 | 2 | 3 | 4 | null
  coordinates: Coordinates
  /** Nearest own city or outpost and its Manhattan distance in cells. */
  nearest: { kind: 'city' | 'outpost', id: string, coordinates: Coordinates, distance: number }
  intel: WorldTargetIntel | null
}

/** `GET /world/targets` (slice 044): « Cibles et menaces » around the player's locations. */
export interface WorldTargetsDataResponse {
  /** `TARGET_SCAN_RADIUS`, 15. */
  radius: number
  /** Sorted by distance, at most `TARGET_SCAN_LIMIT` (60). */
  targets: WorldTarget[]
}

export type WorldTargetsResponse = GenericResponse<WorldTargetsDataResponse>

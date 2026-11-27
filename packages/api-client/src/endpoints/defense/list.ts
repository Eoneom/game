import { DefenseCode } from '@server-core/defense/constant/code'
import { GenericResponse } from '../../response'
import { Requirement } from '../shared/requirement'

export interface DefenseListRequest {
  city_id: string
}

export interface DefenseListEntry {
  code: DefenseCode
  count: number
  /** Defense points per unit. */
  points: number
  attack: number
  life: number
  /** Armed defenses keep the city in the fight without combat troops. */
  armed: boolean
  /** Per-unit cost, duration already reduced by the city's Enceinte. */
  cost: {
    plastic: number
    mushroom: number
    plasma: number
    duration: number
  }
  requirement: Requirement
}

export interface DefenseBuildQueueEntry {
  id: string
  defense_code: DefenseCode
  count: number
}

export interface DefenseOngoingBuild {
  defense_code: DefenseCode
  finish_at: number
  remaining_count: number
  duration_per_unit: number
  started_at: number
}

export interface DefenseListDataResponse {
  city_wall_level: number
  /** Defense points: `total` = 20 × Enceinte level; `used` by existing defenses; `queued` by the active batch and waiting rows. */
  capacity: {
    total: number
    used: number
    queued: number
  }
  defenses: DefenseListEntry[]
  ongoing_build: DefenseOngoingBuild | null
  /** Waiting fortification batches, oldest first. */
  build_queue: DefenseBuildQueueEntry[]
  /** `DEFENSE_BUILD_QUEUE_LIMIT` once the Enceinte is built, otherwise 0. */
  build_queue_limit: number
}

export type DefenseListResponse = GenericResponse<DefenseListDataResponse>

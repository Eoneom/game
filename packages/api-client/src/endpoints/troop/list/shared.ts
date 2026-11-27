import { TroopCode } from '@server-core/troop/constant/code'
import { GenericResponse } from '../../../response'

export interface TroopRecruitQueueEntry {
  id: string
  troop_code: TroopCode
  count: number
}

export interface TroopListDataResponse {
  troops: {
    id: string
    code: TroopCode
    count: number
    ongoing_recruitment?: {
      finish_at: number
      remaining_count: number
      duration_per_unit: number
      started_at: number
    }
  }[]
  /** Waiting recruitment batches of the city, oldest first (empty for outposts). */
  recruit_queue: TroopRecruitQueueEntry[]
  /** Waiting slots in the city: `TROOP_RECRUIT_QUEUE_LIMIT` once its command center is built, otherwise 0. */
  recruit_queue_limit: number
}

export type TroopListResponse = GenericResponse<TroopListDataResponse>

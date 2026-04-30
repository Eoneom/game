import { TroopCode } from '#core/troop/constant/code'

export interface TroopCount {
  code: TroopCode
  count: number
}

export interface OngoingRecruitment {
  finish_at: number
  remaining_count: number
  last_progress: number
  started_at: number
}

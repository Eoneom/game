import { TroopListQueryResponse } from '#query/troop/list'
import { TroopListDataResponse } from '@eoneom/api-client/src/endpoints/troop/list/shared'

export const troopListResponseMapper = ({
  troops,
  costs,
  pending_recruitment,
  recruit_queue,
  recruit_queue_limit
}: TroopListQueryResponse): TroopListDataResponse => {
  const response_troops: TroopListDataResponse['troops'] = troops.map(troop => {
    const cost = costs[troop.code]
    const is_recruiting = pending_recruitment?.troop_id === troop.id
    return {
      id: troop.id,
      code: troop.code,
      count: troop.count,
      ongoing_recruitment: is_recruiting && pending_recruitment ? {
        finish_at: pending_recruitment.finish_at,
        remaining_count: pending_recruitment.remaining_count,
        duration_per_unit: cost.duration,
        started_at: pending_recruitment.started_at
      } : undefined,
    }
  })

  return {
    troops: response_troops,
    recruit_queue: recruit_queue.map(item => ({
      id: item.id,
      troop_code: item.troop_code,
      count: item.count
    })),
    recruit_queue_limit
  }
}

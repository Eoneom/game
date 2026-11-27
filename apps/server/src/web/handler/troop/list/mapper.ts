import { TroopListQueryResponse } from '#query/troop/list'
import { TroopListDataResponse } from '@eoneom/api-client/src/endpoints/troop/list/shared'

export const troopListResponseMapper = ({
  troops,
  costs,
  requirements,
  pending_recruitment,
  recruit_queue,
  recruit_queue_limit,
  exchange_reservations
}: TroopListQueryResponse): TroopListDataResponse => {
  const response_troops: TroopListDataResponse['troops'] = troops.map(troop => {
    const cost = costs[troop.code]
    const is_recruiting = pending_recruitment?.troop_id === troop.id
    return {
      id: troop.id,
      code: troop.code,
      count: troop.count,
      exchange_reserved: exchange_reservations
        .filter(reservation => reservation.troop_code === troop.code)
        .reduce((total, reservation) => total + reservation.count, 0),
      ongoing_recruitment: is_recruiting && pending_recruitment ? {
        finish_at: pending_recruitment.finish_at,
        remaining_count: pending_recruitment.remaining_count,
        duration_per_unit: cost.duration,
        started_at: pending_recruitment.started_at
      } : undefined,
      cost: {
        plastic: cost.resource.plastic,
        mushroom: cost.resource.mushroom,
        plasma: cost.resource.plasma,
        duration: cost.duration
      },
      requirement: requirements[troop.code],
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

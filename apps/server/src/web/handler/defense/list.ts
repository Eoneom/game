import { RequestError } from '@eoneom/api-client'
import {
  NextFunction,
  Request,
  Response
} from 'express'
import {
  DefenseListDataResponse,
  DefenseListResponse
} from '@eoneom/api-client/src/endpoints/defense/list'
import { getPlayerIdFromContext } from '#web/helpers'
import {
  DefenseListQuery,
  DefenseListQueryResponse
} from '#query/defense/list'
import { defense_characteristics } from '#core/defense/constant/characteristic'

export const defenseListResponseMapper = ({
  defenses,
  costs,
  requirements,
  city_wall_level,
  capacity,
  pending_build,
  build_queue,
  build_queue_limit
}: DefenseListQueryResponse): DefenseListDataResponse => ({
  city_wall_level,
  capacity,
  defenses: defenses.map(defense => {
    const characteristic = defense_characteristics[defense.code]
    const cost = costs[defense.code]
    return {
      code: defense.code,
      count: defense.count,
      points: characteristic.points,
      attack: characteristic.attack,
      life: characteristic.life,
      armed: characteristic.armed,
      cost: {
        ...cost.resource,
        duration: cost.duration
      },
      requirement: requirements[defense.code]
    }
  }),
  ongoing_build: pending_build
    ? {
      defense_code: pending_build.defense_code,
      finish_at: pending_build.finish_at,
      remaining_count: pending_build.remaining_count,
      duration_per_unit: costs[pending_build.defense_code].duration,
      started_at: pending_build.started_at
    }
    : null,
  build_queue: build_queue.map(item => ({
    id: item.id,
    defense_code: item.defense_code,
    count: item.count
  })),
  build_queue_limit
})

export const defenseListHandler = async (
  req: Request,
  res: Response<DefenseListResponse>,
  next: NextFunction
) => {
  const city_id = req.params.city_id
  if (!city_id || typeof city_id !== 'string') {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.CITY_ID_NOT_FOUND
    })
  }

  try {
    const player_id = getPlayerIdFromContext(res)
    const result = await new DefenseListQuery().run({
      player_id,
      city_id
    })

    return res.json({
      status: 'ok',
      data: defenseListResponseMapper(result)
    })
  } catch (err) {
    next(err)
  }
}

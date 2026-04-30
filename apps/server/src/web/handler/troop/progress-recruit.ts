import {
  NextFunction, Request, Response
} from 'express'
import {
  TroopProgressRecruitRequest,
  TroopProgressRecruitResponse
} from '@eoneom/api-client/src/endpoints/troop/progress-recruit'
import { Factory } from '#adapter/factory'
import { getPlayerIdFromContext } from '#web/helpers'
import { progressTroopRecruitment } from '#app/command/troop/progress-recruit'
import { TroopError } from '#core/troop/error'

export const troopProgressRecruitHandler = async (
  req: Request<TroopProgressRecruitRequest>,
  res: Response<TroopProgressRecruitResponse>,
  next: NextFunction
) => {
  const city_id = req.body.city_id
  if (!city_id) {
    return res.status(400).json({
      status: 'nok',
      error_code: 'city_id:not-found'
    })
  }

  try {
    const player_id = getPlayerIdFromContext(res)
    const pending = await Factory.getJobQueue().getPendingTroopRecruitProgress({ city_id })

    if (!pending) {
      throw new Error(TroopError.NOT_IN_PROGRESS)
    }

    const { recruit_count } = await progressTroopRecruitment({
      player_id,
      city_id: pending.city_id,
      troop_id: pending.troop_id,
      remaining_count: pending.remaining_count,
      finish_at: pending.finish_at,
      started_at: pending.started_at,
      last_progress: pending.last_progress,
    })

    const response: TroopProgressRecruitResponse = {
      status: 'ok',
      data: { recruit_count }
    }
    return res.status(200).json(response)
  } catch (err) {
    next(err)
  }
}

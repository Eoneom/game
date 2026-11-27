import { RequestError } from '@eoneom/api-client'
import {
  NextFunction, Request, Response
} from 'express'
import {
  TroopCancelQueuedRequest, TroopCancelQueuedResponse
} from '@eoneom/api-client/src/endpoints/troop/cancel-queued'
import { getPlayerIdFromContext } from '#web/helpers'
import { cancelQueuedTroopRecruitment } from '#command/troop/cancel-queued'

export const troopCancelQueuedHandler = async (
  req: Request,
  res: Response<TroopCancelQueuedResponse>,
  next: NextFunction
) => {
  const city_id = (req.body as TroopCancelQueuedRequest).city_id
  const queue_item_id = (req.body as TroopCancelQueuedRequest).queue_item_id

  if (!city_id) {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.CITY_ID_NOT_FOUND
    })
  }

  if (!queue_item_id) {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.QUEUE_ITEM_ID_NOT_FOUND
    })
  }

  try {
    const player_id = getPlayerIdFromContext(res)
    await cancelQueuedTroopRecruitment({
      player_id,
      city_id,
      queue_item_id,
    })

    const response: TroopCancelQueuedResponse = { status: 'ok' }
    return res.json(response)
  } catch (err) {
    next(err)
  }
}

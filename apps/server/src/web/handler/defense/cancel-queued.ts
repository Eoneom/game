import { RequestError } from '@eoneom/api-client'
import {
  NextFunction, Request, Response
} from 'express'
import {
  DefenseCancelQueuedRequest, DefenseCancelQueuedResponse
} from '@eoneom/api-client/src/endpoints/defense/cancel-queued'
import { getPlayerIdFromContext } from '#web/helpers'
import { cancelQueuedDefenseBuild } from '#command/defense/cancel-queued'

export const defenseCancelQueuedHandler = async (
  req: Request,
  res: Response<DefenseCancelQueuedResponse>,
  next: NextFunction
) => {
  const city_id = (req.body as DefenseCancelQueuedRequest).city_id
  const queue_item_id = (req.body as DefenseCancelQueuedRequest).queue_item_id

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
    await cancelQueuedDefenseBuild({
      player_id,
      city_id,
      queue_item_id,
    })

    const response: DefenseCancelQueuedResponse = { status: 'ok' }
    return res.json(response)
  } catch (err) {
    next(err)
  }
}

import { RequestError } from '@eoneom/api-client'
import {
  NextFunction, Request, Response
} from 'express'
import {
  TechnologyCancelQueuedRequest, TechnologyCancelQueuedResponse
} from '@eoneom/api-client/src/endpoints/technology/cancel-queued'
import { getPlayerIdFromContext } from '#web/helpers'
import { cancelQueuedTechnologyResearch } from '#command/technology/cancel-queued'

export const technologyCancelQueuedHandler = async (
  req: Request,
  res: Response<TechnologyCancelQueuedResponse>,
  next: NextFunction
) => {
  const queue_item_id = (req.body as TechnologyCancelQueuedRequest).queue_item_id

  if (!queue_item_id) {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.QUEUE_ITEM_ID_NOT_FOUND
    })
  }

  try {
    const player_id = getPlayerIdFromContext(res)
    await cancelQueuedTechnologyResearch({
      player_id,
      queue_item_id,
    })

    const response: TechnologyCancelQueuedResponse = { status: 'ok' }
    return res.json(response)
  } catch (err) {
    next(err)
  }
}

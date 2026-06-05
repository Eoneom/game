import {
  NextFunction, Request, Response
} from 'express'
import {
  BuildingCancelQueuedRequest, BuildingCancelQueuedResponse
} from '@eoneom/api-client/src/endpoints/building/cancel-queued'
import { getPlayerIdFromContext } from '#web/helpers'
import { cancelQueuedBuildingUpgrade } from '#command/building/cancel-queued'

export const buildingCancelQueuedHandler = async (
  req: Request,
  res: Response<BuildingCancelQueuedResponse>,
  next: NextFunction
) => {
  const city_id = (req.body as BuildingCancelQueuedRequest).city_id
  const queue_item_id = (req.body as BuildingCancelQueuedRequest).queue_item_id

  if (!city_id) {
    return res.status(400).json({
      status: 'nok',
      error_code: 'city_id:not-found'
    })
  }

  if (!queue_item_id) {
    return res.status(400).json({
      status: 'nok',
      error_code: 'queue_item_id:not-found'
    })
  }

  try {
    const player_id = getPlayerIdFromContext(res)
    await cancelQueuedBuildingUpgrade({
      player_id,
      city_id,
      queue_item_id,
    })

    const response: BuildingCancelQueuedResponse = { status: 'ok' }
    return res.json(response)
  } catch (err) {
    next(err)
  }
}

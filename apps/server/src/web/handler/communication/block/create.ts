import { RequestError } from '@eoneom/api-client'
import {
  NextFunction,
  Request,
  Response
} from 'express'
import { CommunicationBlockPlayerResponse } from '@eoneom/api-client/src/endpoints/communication/block/create'
import { getPlayerIdFromContext } from '#web/helpers'
import { blockCommunicationPlayer } from '#app/command/communication/block/block'

export const communicationBlockPlayerHandler = async (
  req: Request,
  res: Response<CommunicationBlockPlayerResponse>,
  next: NextFunction
) => {
  const player_name = req.body?.player_name
  if (!player_name || typeof player_name !== 'string') {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.PLAYER_NAME_NOT_FOUND
    })
  }

  try {
    const blocker_id = getPlayerIdFromContext(res)
    const { blocked_id } = await blockCommunicationPlayer({
      blocker_id,
      player_name
    })

    return res.json({
      status: 'ok',
      data: { blocked_id }
    })
  } catch (err) {
    next(err)
  }
}

import { RequestError } from '@eoneom/api-client'
import {
  NextFunction,
  Request,
  Response
} from 'express'
import { CommunicationUnblockPlayerResponse } from '@eoneom/api-client/src/endpoints/communication/block/delete'
import { getPlayerIdFromContext } from '#web/helpers'
import { unblockCommunicationPlayer } from '#app/command/communication/block/unblock'

export const communicationUnblockPlayerHandler = async (
  req: Request,
  res: Response<CommunicationUnblockPlayerResponse>,
  next: NextFunction
) => {
  const blocked_id = req.params.player_id
  if (!blocked_id || typeof blocked_id !== 'string') {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.PLAYER_ID_NOT_FOUND
    })
  }

  try {
    const blocker_id = getPlayerIdFromContext(res)
    await unblockCommunicationPlayer({
      blocker_id,
      blocked_id
    })

    return res.json({ status: 'ok' })
  } catch (err) {
    next(err)
  }
}

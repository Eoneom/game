import { RequestError } from '@eoneom/api-client'
import {
  NextFunction,
  Request,
  Response
} from 'express'
import { getPlayerIdFromContext } from '#web/helpers'
import { outpostSetPermanent } from '#app/command/outpost/set-permanent'
import {
  OutpostSetPermanentRequest,
  OutpostSetPermanentResponse
} from '@eoneom/api-client/src/endpoints/outpost/set-permanent'

export const outpostSetPermanentHandler = async (
  req: Request<OutpostSetPermanentRequest>,
  res: Response<OutpostSetPermanentResponse>,
  next: NextFunction
) => {
  const outpost_id = req.body.outpost_id
  if (!outpost_id) {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.OUTPOST_ID_NOT_FOUND
    })
  }

  try {
    const player_id = getPlayerIdFromContext(res)
    await outpostSetPermanent({
      outpost_id,
      player_id
    })

    return res.status(200).json({ status: 'ok' })
  } catch (err) {
    next(err)
  }
}

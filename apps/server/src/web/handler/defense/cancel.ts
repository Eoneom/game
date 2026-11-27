import { RequestError } from '@eoneom/api-client'
import {
  NextFunction, Request, Response
} from 'express'
import {
  DefenseCancelRequest, DefenseCancelResponse
} from '@eoneom/api-client/src/endpoints/defense/cancel'
import { getPlayerIdFromContext } from '#web/helpers'
import { cancelDefenseBuild } from '#app/command/defense/cancel'

export const defenseCancelHandler = async (
  req: Request<DefenseCancelRequest>,
  res: Response<DefenseCancelResponse>,
  next: NextFunction
) => {
  const city_id = req.body.city_id
  if (!city_id) {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.CITY_ID_NOT_FOUND
    })
  }

  try {
    const player_id = getPlayerIdFromContext(res)
    await cancelDefenseBuild({
      player_id,
      city_id,
    })

    const response: DefenseCancelResponse = { status: 'ok' }
    return res.json(response)
  } catch (err) {
    next(err)
  }
}

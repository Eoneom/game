import { RequestError } from '@eoneom/api-client'
import {
  NextFunction, Request, Response
} from 'express'
import {
  TroopCancelRequest, TroopCancelResponse
} from '@eoneom/api-client/src/endpoints/troop/cancel'
import { getPlayerIdFromContext } from '#web/helpers'
import { cancelTroop } from '#app/command/troop/cancel'

export const troopCancelHandler = async (
  req: Request<TroopCancelRequest>,
  res: Response<TroopCancelResponse>,
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
    await cancelTroop({
      player_id,
      city_id,
    })

    const response: TroopCancelResponse = { status: 'ok' }
    return res.json(response)
  } catch (err) {
    next(err)
  }
}

import { RequestError } from '@eoneom/api-client'
import {
  NextFunction, Request, Response
} from 'express'
import {
  TroopRecruitRequest, TroopRecruitResponse
} from '@eoneom/api-client/src/endpoints/troop/recruit'
import { getPlayerIdFromContext } from '#web/helpers'
import { recruitTroop } from '#app/command/troop/recruit'

export const troopRecruitHandler = async (
  req: Request<TroopRecruitRequest>,
  res: Response<TroopRecruitResponse>,
  next: NextFunction
) => {
  const city_id = req.body.city_id
  if (!city_id) {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.CITY_ID_NOT_FOUND
    })
  }

  const count = req.body.count
  if (!count) {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.COUNT_NOT_FOUND
    })
  }

  const troop_code = req.body.troop_code
  if (!troop_code) {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.TROOP_CODE_NOT_FOUND
    })
  }

  try {
    const player_id = getPlayerIdFromContext(res)
    await recruitTroop({
      city_id,
      count,
      player_id,
      troop_code
    })
    const response: TroopRecruitResponse = { status: 'ok' }
    return res.status(200).json(response)
  } catch (err) {
    next(err)
  }
}

import { RequestError } from '@eoneom/api-client'
import { citySettle } from '#app/command/city/settle'
import {
  CitySettleRequest,
  CitySettleResponse
} from '@eoneom/api-client/src/endpoints/city/settle'
import { getPlayerIdFromContext } from '#web/helpers'
import {
  NextFunction,
  Request,
  Response
} from 'express'

export const citySettleHandler = async (
  req: Request<CitySettleRequest>,
  res: Response<CitySettleResponse>,
  next: NextFunction
) => {
  try {
    const outpost_id = req.body.outpost_id
    if (!outpost_id) {
      return res.status(400).json({
        status: 'nok',
        error_code: RequestError.OUTPOST_ID_NOT_FOUND
      })
    }

    const city_name = req.body.city_name
    if (!city_name) {
      return res.status(400).json({
        status: 'nok',
        error_code: RequestError.CITY_NAME_NOT_FOUND
      })
    }

    const player_id = getPlayerIdFromContext(res)
    const { city_id } = await citySettle({
      outpost_id,
      player_id,
      city_name
    })

    return res.json({
      status: 'ok',
      data: { city_id }
    })
  } catch (err) {
    next(err)
  }
}

import { RequestError } from '@eoneom/api-client'
import {
  NextFunction,
  Request,
  Response
} from 'express'
import { TroopListResponse } from '@eoneom/api-client/src/endpoints/troop/list/shared'
import { getPlayerIdFromContext } from '#web/helpers'
import { TroopListQuery } from '#query/troop/list'
import { troopListResponseMapper } from '#web/handler/troop/list/mapper'

export const troopListCityHandler = async (
  req: Request,
  res: Response<TroopListResponse>,
  next: NextFunction
) => {
  const city_id = req.params.city_id
  if (!city_id) {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.CITY_ID_NOT_FOUND
    })
  }

  try {
    const player_id = getPlayerIdFromContext(res)
    const result = await new TroopListQuery().run({
      player_id,
      location: {
        type: 'city',
        city_id,
      },
    })
    const response = troopListResponseMapper(result)

    return res.json({
      status: 'ok',
      data: response
    })
  } catch (err) {
    next(err)
  }
}



import {
  NextFunction,
  Request,
  Response
} from 'express'
import { LocationActivityResponse } from '@eoneom/api-client'
import { getPlayerIdFromContext } from '#web/helpers'
import { LocationActivityQuery } from '#query/location/activity'
import { locationActivityResponseMapper } from '#web/handler/location/activity.mapper'

export const cityActivityHandler = async (
  req: Request,
  res: Response<LocationActivityResponse>,
  next: NextFunction
) => {
  const city_id = req.params.city_id
  if (!city_id || Array.isArray(city_id)) {
    return res.status(400).json({
      status: 'nok',
      error_code: 'city_id:not-found'
    })
  }

  try {
    const player_id = getPlayerIdFromContext(res)
    const result = await new LocationActivityQuery().run({
      player_id,
      location: { type: 'city', city_id },
    })
    return res.json({
      status: 'ok',
      data: locationActivityResponseMapper(result),
    })
  } catch (err) {
    next(err)
  }
}

export const outpostActivityHandler = async (
  req: Request,
  res: Response<LocationActivityResponse>,
  next: NextFunction
) => {
  const outpost_id = req.params.outpost_id
  if (!outpost_id || Array.isArray(outpost_id)) {
    return res.status(400).json({
      status: 'nok',
      error_code: 'outpost_id:not-found'
    })
  }

  try {
    const player_id = getPlayerIdFromContext(res)
    const result = await new LocationActivityQuery().run({
      player_id,
      location: { type: 'outpost', outpost_id },
    })
    return res.json({
      status: 'ok',
      data: locationActivityResponseMapper(result),
    })
  } catch (err) {
    next(err)
  }
}

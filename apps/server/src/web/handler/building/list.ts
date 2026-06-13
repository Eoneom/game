import { RequestError } from '@eoneom/api-client'
import {
  NextFunction,
  Request,
  Response
} from 'express'
import { BuildingListResponse } from '@eoneom/api-client/src/endpoints/building/list'
import { getPlayerIdFromContext } from '#web/helpers'
import { BuildingListQuery } from '#query/building/list'
import { buildingListResponseMapper } from '#web/handler/building/list.mapper'

export const buildingListHandler = async (
  req: Request,
  res: Response<BuildingListResponse>,
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
    const result = await new BuildingListQuery().run({
      city_id,
      player_id
    })

    return res.json({
      status: 'ok',
      data: buildingListResponseMapper(result)
    })
  } catch (err) {
    next(err)
  }
}

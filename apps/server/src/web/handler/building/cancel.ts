import { RequestError } from '@eoneom/api-client'
import {
  NextFunction, Request, Response
} from 'express'
import {
  BuildingCancelRequest, BuildingCancelResponse
} from '@eoneom/api-client/src/endpoints/building/cancel'
import { getPlayerIdFromContext } from '#web/helpers'
import { cancelBuilding } from '#command/building/cancel'

export const buildingCancelHandler = async (
  req: Request<BuildingCancelRequest>,
  res: Response<BuildingCancelResponse>,
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
    await cancelBuilding({
      player_id,
      city_id,
    })

    const response: BuildingCancelResponse = { status: 'ok' }
    return res.json(response)
  } catch (err) {
    next(err)
  }
}

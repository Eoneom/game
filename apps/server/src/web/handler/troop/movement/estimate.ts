import { RequestError } from '@eoneom/api-client'
import {
  NextFunction,
  Request,
  Response
} from 'express'
import {
  TroopMovementEstimateRequest,
  TroopMovementEstimateResponse
} from '@eoneom/api-client/src/endpoints/troop/movement/estimate'
import { TroopMovementEstimateQuery } from '#query/troop/movement/estimate'
import { getPlayerIdFromContext } from '#web/helpers'

export const troopEstimateMovementHandler = async (
  req: Request<TroopMovementEstimateRequest>,
  res: Response<TroopMovementEstimateResponse>,
  next: NextFunction
) => {
  const origin = req.body.origin
  if (!origin) {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.ORIGIN_NOT_FOUND
    })
  }

  const destination = req.body.destination
  if (!destination) {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.DESTINATION_NOT_FOUND
    })
  }

  const troop_codes = req.body.troop_codes
  if (!troop_codes) {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.TROOP_CODES_NOT_FOUND
    })
  }

  try {
    const player_id = getPlayerIdFromContext(res)
    const {
      distance,
      speed,
      duration,
      transport_capacity,
      destination_capacity_exceeded,
    } = await new TroopMovementEstimateQuery().run({
      origin,
      destination,
      troop_codes,
      troops: req.body.troops,
      player_id,
      resources: req.body.resources,
    })

    const response: TroopMovementEstimateResponse = {
      status: 'ok',
      data: {
        distance,
        speed,
        duration,
        transport_capacity,
        destination_capacity_exceeded,
      }
    }

    return res.status(200).json(response)
  } catch (err) {
    next(err)
  }
}

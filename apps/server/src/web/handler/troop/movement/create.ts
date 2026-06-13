import { RequestError } from '@eoneom/api-client'
import {
  NextFunction,
  Request,
  Response
} from 'express'
import { getPlayerIdFromContext } from '#web/helpers'
import {
  TroopMovementCreateRequest,
  TroopMovementCreateResponse
} from '@eoneom/api-client/src/endpoints/troop/movement/create'
import { createTroopMovement } from '#app/command/troop/movement/create'

export const troopCreateMovementHandler = async (
  req: Request<TroopMovementCreateRequest>,
  res: Response<TroopMovementCreateResponse>,
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

  const troops = req.body.troops
  if (!troops) {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.TROOPS_NOT_FOUND
    })
  }

  const action = req.body.action
  if (!action) {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.ACTION_NOT_FOUND
    })
  }

  try {
    const player_id = getPlayerIdFromContext(res)
    const { deleted_outpost_id } = await createTroopMovement({
      player_id,
      action,
      origin,
      destination,
      move_troops: troops,
      resources: req.body.resources,
    })
    const response: TroopMovementCreateResponse = {
      status: 'ok',
      data: { deleted_outpost_id }
    }

    return res.status(200).json(response)
  } catch (err) {
    next(err)
  }
}

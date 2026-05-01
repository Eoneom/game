import {
  NextFunction, Request, Response
} from 'express'
import {
  TroopGetMovementResponse,
  TroopGetMovementDataResponse
} from '@eoneom/api-client/src/endpoints/troop/movement/get'
import { getPlayerIdFromContext } from '#web/helpers'
import {
  TroopMovementGetQuery,
  TroopMovementGetQueryResponse
} from '#query/troop/movement/get'

export const troopGetMovementHandler = async (
  req: Request,
  res: Response<TroopGetMovementResponse>,
  next: NextFunction
) => {
  const movement_id = req.params.movement_id
  if (!movement_id) {
    return res.status(400).json({
      status: 'nok',
      error_code: 'movement_id:not-found'
    })
  }

  try {
    const player_id = getPlayerIdFromContext(res)
    const result = await new TroopMovementGetQuery().run({
      player_id,
      movement_id
    })
    const response = response_mapper(result)

    return res.json({
      status: 'ok',
      data: response
    })
  } catch (err) {
    next(err)
  }
}

const response_mapper = ({
  movement,
  troops,
  arrive_at,
}: TroopMovementGetQueryResponse): TroopGetMovementDataResponse => {
  const response_movements: TroopGetMovementDataResponse = {
    action: movement.action,
    origin: {
      sector: movement.origin.sector,
      x: movement.origin.x,
      y: movement.origin.y
    },
    destination: {
      sector: movement.destination.sector,
      x: movement.destination.x,
      y: movement.destination.y
    },
    arrive_at,
    troops: troops.map((troop) => ({
      code: troop.code,
      count: troop.count
    }))
  }

  return response_movements
}

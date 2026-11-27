import {
  NextFunction, Request, Response
} from 'express'
import { TroopMovementCapacityResponse } from '@eoneom/api-client/src/endpoints/troop/movement/capacity'
import { getPlayerIdFromContext } from '#web/helpers'
import { TroopMovementCapacityQuery } from '#query/troop/movement/capacity'

export const troopMovementCapacityHandler = async (
  req: Request,
  res: Response<TroopMovementCapacityResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const {
      used, limit
    } = await new TroopMovementCapacityQuery().run({ player_id })

    return res.json({
      status: 'ok',
      data: {
        used,
        limit
      }
    })
  } catch (err) {
    next(err)
  }
}

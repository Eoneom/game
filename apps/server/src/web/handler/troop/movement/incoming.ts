import {
  NextFunction, Request, Response
} from 'express'
import { TroopListIncomingMovementResponse } from '@eoneom/api-client/src/endpoints/troop/movement/incoming'
import { getPlayerIdFromContext } from '#web/helpers'
import { TroopMovementIncomingQuery } from '#query/troop/movement/incoming'

export const troopListIncomingMovementHandler = async (
  req: Request,
  res: Response<TroopListIncomingMovementResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const { movements } = await new TroopMovementIncomingQuery().run({ player_id })

    return res.json({
      status: 'ok',
      data: {
        movements: movements.map(movement => ({
          id: movement.id,
          target: {
            kind: movement.target.kind,
            id: movement.target.id,
            name: movement.target.name,
            coordinates: movement.target.coordinates,
          },
          arrive_at: movement.arrive_at,
          ...(movement.origin ? { origin: movement.origin } : {}),
          ...(movement.departure_at !== undefined ? { departure_at: movement.departure_at } : {}),
          ...(movement.attacker ? { attacker: movement.attacker } : {}),
          ...(movement.unit_count !== undefined ? { unit_count: movement.unit_count } : {}),
          ...(movement.troops ? { troops: movement.troops } : {}),
        })),
      }
    })
  } catch (err) {
    next(err)
  }
}

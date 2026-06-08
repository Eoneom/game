import {
  NextFunction, Request, Response
} from 'express'
import {
  TroopListMovementResponse,
  TroopListMovementDataResponse
} from '@eoneom/api-client/src/endpoints/troop/movement/list'
import { getPlayerIdFromContext } from '#web/helpers'
import {
  TroopMovementListQuery,
  TroopMovementListQueryResponse
} from '#query/troop/movement/list'

export const troopListMovementHandler = async (
  req: Request,
  res: Response<TroopListMovementResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const result = await new TroopMovementListQuery().run({ player_id })
    const response = response_mapper(result)

    return res.json({
      status: 'ok',
      data: response
    })
  } catch (err) {
    next(err)
  }
}

const response_mapper = ({ movements }: TroopMovementListQueryResponse): TroopListMovementDataResponse => {
  const response_movements: TroopListMovementDataResponse['movements'] = movements.map(({ movement, arrive_at }) => {
    return {
      id: movement.id,
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
      resources: {
        plastic: movement.resources.plastic,
        mushroom: movement.resources.mushroom,
        plasma: movement.resources.plasma,
      },
    }
  })

  return { movements: response_movements }
}

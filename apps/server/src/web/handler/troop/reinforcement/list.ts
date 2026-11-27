import {
  NextFunction,
  Request,
  Response
} from 'express'
import {
  TroopReinforcementAbroadResponse,
  TroopReinforcementListResponse
} from '@eoneom/api-client/src/endpoints/troop/reinforcement/list'
import { getPlayerIdFromContext } from '#web/helpers'
import { TroopReinforcementListQuery } from '#query/troop/reinforcement/list'
import { TroopReinforcementAbroadQuery } from '#query/troop/reinforcement/abroad'

export const troopReinforcementListHandler = async (
  req: Request,
  res: Response<TroopReinforcementListResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const reinforcements = await new TroopReinforcementListQuery().run({
      player_id,
      city_id: typeof req.query.city_id === 'string' ? req.query.city_id : '',
    })

    return res.json({
      status: 'ok',
      data: { reinforcements }
    })
  } catch (err) {
    next(err)
  }
}

export const troopReinforcementAbroadHandler = async (
  _req: Request,
  res: Response<TroopReinforcementAbroadResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const reinforcements = await new TroopReinforcementAbroadQuery().run({ player_id })

    return res.json({
      status: 'ok',
      data: { reinforcements }
    })
  } catch (err) {
    next(err)
  }
}

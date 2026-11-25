import { RequestError } from '@eoneom/api-client'
import {
  NextFunction,
  Request,
  Response
} from 'express'
import { getPlayerIdFromContext } from '#web/helpers'
import { citySetCombatStrategy } from '#app/command/city/set-combat-strategy'
import { isCombatStrategy } from '#core/combat/value/combat-strategy'
import { CitySetCombatStrategyResponse } from '@eoneom/api-client/src/endpoints/city/set-combat-strategy'

export const citySetCombatStrategyHandler = async (
  req: Request<{ city_id: string }, unknown, { combat_strategy?: unknown }>,
  res: Response<CitySetCombatStrategyResponse>,
  next: NextFunction
) => {
  const city_id = req.params.city_id
  if (!city_id) {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.CITY_ID_NOT_FOUND
    })
  }

  const combat_strategy = req.body?.combat_strategy
  if (!isCombatStrategy(combat_strategy)) {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.COMBAT_STRATEGY_NOT_FOUND
    })
  }

  try {
    const player_id = getPlayerIdFromContext(res)
    await citySetCombatStrategy({
      city_id,
      player_id,
      combat_strategy
    })

    return res.status(200).json({ status: 'ok' })
  } catch (err) {
    next(err)
  }
}

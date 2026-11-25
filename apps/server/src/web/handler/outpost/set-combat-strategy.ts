import { RequestError } from '@eoneom/api-client'
import {
  NextFunction,
  Request,
  Response
} from 'express'
import { getPlayerIdFromContext } from '#web/helpers'
import { outpostSetCombatStrategy } from '#app/command/outpost/set-combat-strategy'
import { isCombatStrategy } from '#core/combat/value/combat-strategy'
import { OutpostSetCombatStrategyResponse } from '@eoneom/api-client/src/endpoints/outpost/set-combat-strategy'

export const outpostSetCombatStrategyHandler = async (
  req: Request<{ outpost_id: string }, unknown, { combat_strategy?: unknown }>,
  res: Response<OutpostSetCombatStrategyResponse>,
  next: NextFunction
) => {
  const outpost_id = req.params.outpost_id
  if (!outpost_id) {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.OUTPOST_ID_NOT_FOUND
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
    await outpostSetCombatStrategy({
      outpost_id,
      player_id,
      combat_strategy
    })

    return res.status(200).json({ status: 'ok' })
  } catch (err) {
    next(err)
  }
}

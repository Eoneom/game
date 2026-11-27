import {
  NextFunction, Request, Response
} from 'express'
import { WorldIntelResponse } from '@eoneom/api-client/src/endpoints/world/intel'
import { WorldError } from '#core/world/error'
import { WorldIntelQuery } from '#query/world/intel'
import { getPlayerIdFromContext } from '#web/helpers'
import { parseIntegerParam } from '#web/handler/world/query-number'

export const worldIntelHandler = async (
  req: Request,
  res: Response<WorldIntelResponse>,
  next: NextFunction
) => {
  const x = parseIntegerParam(req.query.x)
  const y = parseIntegerParam(req.query.y)
  if (x === null || y === null) {
    return res.status(400).json({
      status: 'nok',
      error_code: WorldError.INVALID_BOUNDS
    })
  }

  try {
    const player_id = getPlayerIdFromContext(res)
    const data = await new WorldIntelQuery().run({
      player_id,
      x,
      y
    })
    return res.json({
      status: 'ok',
      data
    })
  } catch (err) {
    next(err)
  }
}

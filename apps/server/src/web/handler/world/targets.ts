import {
  NextFunction, Request, Response
} from 'express'
import { WorldTargetsResponse } from '@eoneom/api-client/src/endpoints/world/targets'
import { WorldTargetsQuery } from '#query/world/targets'
import { getPlayerIdFromContext } from '#web/helpers'

export const worldTargetsHandler = async (
  _req: Request,
  res: Response<WorldTargetsResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const data = await new WorldTargetsQuery().run({ player_id })
    return res.json({
      status: 'ok',
      data
    })
  } catch (err) {
    next(err)
  }
}

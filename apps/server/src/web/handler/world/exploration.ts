import {
  NextFunction, Request, Response
} from 'express'
import { WorldExplorationResponse } from '@eoneom/api-client/src/endpoints/world/exploration'
import { WorldExplorationQuery } from '#query/world/exploration'
import { getPlayerIdFromContext } from '#web/helpers'

export const worldExplorationHandler = async (
  _req: Request,
  res: Response<WorldExplorationResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const data = await new WorldExplorationQuery().run({ player_id })
    return res.json({
      status: 'ok',
      data
    })
  } catch (err) {
    next(err)
  }
}

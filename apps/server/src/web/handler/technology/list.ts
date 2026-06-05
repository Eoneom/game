import {
  NextFunction, Request, Response
} from 'express'
import { TechnologyListResponse } from '@eoneom/api-client/src/endpoints/technology/list'
import { getPlayerIdFromContext } from '#web/helpers'
import { TechnologyListQuery } from '#query/technology/list'
import { technologyListResponseMapper } from '#web/handler/technology/list.mapper'

export const technologyListHandler = async (
  req: Request<void>,
  res: Response<TechnologyListResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const result = await new TechnologyListQuery().run({ player_id })

    return res.json({
      status: 'ok',
      data: technologyListResponseMapper(result)
    })
  } catch (err) {
    next(err)
  }
}

import {
  NextFunction, Request, Response
} from 'express'
import { TechnologyListResponse } from '@eoneom/api-client/src/endpoints/technology/list'
import { getPlayerIdFromContext } from '#web/helpers'
import { TechnologyListQuery } from '#query/technology/list'
import { technologyListResponseMapper } from '#web/handler/technology/list.mapper'

/** `GET /technology[?city_id=]` (slice 043: `city_id` adds `research_cost`). */
export const technologyListHandler = async (
  req: Request,
  res: Response<TechnologyListResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const city_id = typeof req.query.city_id === 'string' && req.query.city_id
      ? req.query.city_id
      : undefined
    const result = await new TechnologyListQuery().run({
      player_id,
      city_id
    })

    return res.json({
      status: 'ok',
      data: technologyListResponseMapper(result)
    })
  } catch (err) {
    next(err)
  }
}

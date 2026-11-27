import {
  NextFunction, Request, Response
} from 'express'
import { WorldTerrainResponse } from '@eoneom/api-client/src/endpoints/world/terrain'
import { WorldTerrainQuery } from '#query/world/terrain'

/** One day: the terrain never changes once the world is generated (slice 044). */
const TERRAIN_CACHE_CONTROL = 'private, max-age=86400'

export const worldTerrainHandler = async (
  _req: Request,
  res: Response<WorldTerrainResponse>,
  next: NextFunction
) => {
  try {
    const data = await new WorldTerrainQuery().run()
    res.setHeader('Cache-Control', TERRAIN_CACHE_CONTROL)
    return res.json({
      status: 'ok',
      data
    })
  } catch (err) {
    next(err)
  }
}

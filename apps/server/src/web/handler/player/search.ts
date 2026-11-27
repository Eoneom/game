import {
  NextFunction,
  Request,
  Response
} from 'express'
import { PlayerSearchResponse } from '@eoneom/api-client/src/endpoints/player/search'
import { getPlayerIdFromContext } from '#web/helpers'
import { PlayerSearchQuery } from '#query/player/search'

export const playerSearchHandler = async (
  req: Request,
  res: Response<PlayerSearchResponse>,
  next: NextFunction
) => {
  try {
    getPlayerIdFromContext(res)
    const q = typeof req.query.q === 'string' ? req.query.q : ''
    const players = await new PlayerSearchQuery().run({ q })

    return res.json({
      status: 'ok',
      data: {
        players: players.map(player => ({
          id: player.id,
          name: player.name,
          faction_code: player.faction_code
        }))
      }
    })
  } catch (err) {
    next(err)
  }
}

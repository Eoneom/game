import {
  NextFunction, Request, Response
} from 'express'
import {
  WorldMarkersDataResponse,
  WorldMarkersResponse
} from '@eoneom/api-client/src/endpoints/world/markers'
import { WorldError } from '#core/world/error'
import { WorldMarkersQuery } from '#query/world/markers'
import { DescribedSettlements } from '#query/world/settlements'
import { getPlayerIdFromContext } from '#web/helpers'
import { parseIntegerParam } from '#web/handler/world/query-number'

export const worldMarkersHandler = async (
  req: Request,
  res: Response<WorldMarkersResponse>,
  next: NextFunction
) => {
  const min_x = parseIntegerParam(req.query.min_x)
  const max_x = parseIntegerParam(req.query.max_x)
  const min_y = parseIntegerParam(req.query.min_y)
  const max_y = parseIntegerParam(req.query.max_y)

  if (min_x === null || max_x === null || min_y === null || max_y === null) {
    return res.status(400).json({
      status: 'nok',
      error_code: WorldError.INVALID_BOUNDS
    })
  }

  try {
    const player_id = getPlayerIdFromContext(res)
    const result = await new WorldMarkersQuery().run({
      player_id,
      min_x,
      max_x,
      min_y,
      max_y
    })
    return res.json({
      status: 'ok',
      data: response_mapper(result)
    })
  } catch (err) {
    next(err)
  }
}

const response_mapper = ({
  viewer,
  cities,
  outposts
}: DescribedSettlements): WorldMarkersDataResponse => ({
  viewer,
  cities: cities.map(city => ({
    id: city.id,
    name: city.name,
    player_id: city.player_id,
    owner_name: city.owner_name,
    faction_code: city.faction_code,
    alliance_tag: city.alliance_tag,
    relation: city.relation,
    size: city.size,
    coordinates: city.coordinates
  })),
  outposts: outposts.map(outpost => ({
    id: outpost.id,
    player_id: outpost.player_id,
    owner_name: outpost.owner_name,
    faction_code: outpost.faction_code,
    alliance_tag: outpost.alliance_tag,
    relation: outpost.relation,
    type: outpost.type,
    coordinates: outpost.coordinates
  }))
})

import { WorldError } from '#core/world/error'
import {
  NextFunction, Request, Response
} from 'express'
import {
  WorldGetCellsDataResponse,
  WorldGetCellsResponse
} from '@eoneom/api-client/src/endpoints/world/get-cells'
import {
  WorldGetCellsQuery, WorldGetCellsQueryResponse
} from '#query/world/get-cells'
import { getPlayerIdFromContext } from '#web/helpers'
import { parseIntegerParam } from '#web/handler/world/query-number'

type CellsDetail = 'terrain' | 'full'

const parseDetail = (value: unknown): CellsDetail => {
  if (value === 'terrain') {
    return 'terrain'
  }
  return 'full'
}

export const worldGetCellsHandler = async (
  req: Request,
  res: Response<WorldGetCellsResponse>,
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
    const detail = parseDetail(req.query.detail)
    const query_result = await new WorldGetCellsQuery().run({
      player_id,
      min_x,
      max_x,
      min_y,
      max_y,
      detail
    })

    const response = response_mapper({
      player_id,
      detail,
      ...query_result
    })

    return res.json({
      status: 'ok',
      data: response
    })
  } catch (err) {
    next(err)
  }
}

const response_mapper = ({
  player_id,
  detail,
  cells,
  explored_cell_ids,
  viewer_faction_code,
  settlements
}: {
  player_id: string
  detail: CellsDetail
} & WorldGetCellsQueryResponse): WorldGetCellsDataResponse => {
  // One Set lookup per cell instead of scanning every explored id (slice 044).
  const explored = new Set(explored_cell_ids)
  return {
    viewer: {
      player_id,
      faction_code: viewer_faction_code
    },
    cells: cells.map(cell => cell_mapper({
      cell,
      explored,
      detail
    })),
    settlements
  }
}

const cell_mapper = ({
  cell,
  explored,
  detail
}: {
  cell: WorldGetCellsQueryResponse['cells'][number],
  explored: Set<string>,
  detail: CellsDetail
}): WorldGetCellsDataResponse['cells'][number] => {
  const is_explored = explored.has(cell.id)
  const include_coefficients = detail === 'full' && is_explored
  const characteristic: WorldGetCellsDataResponse['cells'][number]['characteristic'] = include_coefficients ? {
    resource_coefficient: {
      plastic: cell.resource_coefficient.plastic,
      mushroom: cell.resource_coefficient.mushroom
    },
    solar_coefficient: cell.solar_coefficient
  } : undefined

  return {
    coordinates: {
      x: cell.coordinates.x,
      y: cell.coordinates.y
    },
    type: cell.type,
    explored: is_explored,
    characteristic
  }
}

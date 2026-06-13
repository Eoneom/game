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

const parseBound = (value: unknown): number | null => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null
  }
  const parsed = Number.parseInt(`${value}`, 10)
  return Number.isFinite(parsed) ? parsed : null
}

export const worldGetCellsHandler = async (
  req: Request,
  res: Response<WorldGetCellsResponse>,
  next: NextFunction
) => {
  const min_x = parseBound(req.query.min_x)
  const max_x = parseBound(req.query.max_x)
  const min_y = parseBound(req.query.min_y)
  const max_y = parseBound(req.query.max_y)

  if (min_x === null || max_x === null || min_y === null || max_y === null) {
    return res.status(400).json({
      status: 'nok',
      error_code: WorldError.INVALID_BOUNDS
    })
  }

  try {
    const player_id = getPlayerIdFromContext(res)
    const {
      cells,
      explored_cell_ids
    } = await new WorldGetCellsQuery().run({
      player_id,
      min_x,
      max_x,
      min_y,
      max_y
    })

    const response = response_mapper({
      cells,
      explored_cell_ids
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
  cells,
  explored_cell_ids
}: WorldGetCellsQueryResponse): WorldGetCellsDataResponse => {
  return {
    cells: cells.map(cell => cell_mapper({
      cell,
      explored_cell_ids
    }))
  }
}

const cell_mapper = ({
  cell,
  explored_cell_ids
}: {
  cell: WorldGetCellsQueryResponse['cells'][number],
  explored_cell_ids: string[]
}): WorldGetCellsDataResponse['cells'][number] => {
  const is_explored = explored_cell_ids.some((explored_cell_id) => explored_cell_id === cell.id)
  const characteristic: WorldGetCellsDataResponse['cells'][number]['characteristic'] = is_explored ? {
    type: cell.type,
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
    characteristic
  }
}

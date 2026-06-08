import {
  NextFunction,
  Request,
  Response
} from 'express'
import {
  OutpostGetDataResponse,
  OutpostGetRequest,
  OutpostGetResponse
} from '@eoneom/api-client/src/endpoints/outpost/get'
import { getPlayerIdFromContext } from '#web/helpers'
import {
  OutpostGetQuery,
  OutpostGetQueryResponse
} from '#query/outpost/get'

export const outpostGetHandler = async (
  req: Request<OutpostGetRequest>,
  res: Response<OutpostGetResponse>,
  next: NextFunction
) => {
  const outpost_id = req.params.outpost_id
  if (!outpost_id) {
    return res.status(400).json({
      status: 'nok',
      error_code: 'outpost_id:not-found'
    })
  }

  try {
    const player_id = getPlayerIdFromContext(res)
    const result = await new OutpostGetQuery().run({
      outpost_id,
      player_id
    })
    const response = response_mapper(result)

    return res.json({
      status: 'ok',
      data: response
    })
  } catch (err) {
    next(err)
  }
}

const response_mapper = ({
  outpost,
  cell,
  resource_stock,
  earnings_per_second,
  pre_cell_earnings_per_second,
  cell_resource_coefficient,
  warehouses_capacity,
  warehouse_full_in_seconds
}: OutpostGetQueryResponse): OutpostGetDataResponse => {
  return {
    id: outpost.id,
    coordinates: cell.coordinates,
    type: outpost.type,
    plastic: resource_stock.plastic,
    mushroom: resource_stock.mushroom,
    plasma: resource_stock.plasma,
    earnings_per_second: {
      plastic: earnings_per_second.plastic,
      mushroom: earnings_per_second.mushroom,
      plasma: earnings_per_second.plasma
    },
    pre_cell_earnings_per_second: {
      plastic: pre_cell_earnings_per_second.plastic,
      mushroom: pre_cell_earnings_per_second.mushroom,
      plasma: pre_cell_earnings_per_second.plasma
    },
    cell_resource_coefficient: {
      plastic: cell_resource_coefficient.plastic,
      mushroom: cell_resource_coefficient.mushroom
    },
    warehouses_capacity: {
      plastic: warehouses_capacity.plastic,
      mushroom: warehouses_capacity.mushroom
    },
    warehouse_full_in_seconds: {
      plastic: warehouse_full_in_seconds.plastic,
      mushroom: warehouse_full_in_seconds.mushroom
    }
  }
}

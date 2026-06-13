import { RequestError } from '@eoneom/api-client'
import {
  NextFunction,
  Request,
  Response
} from 'express'
import {
  CityGetRequest,
  CityGetResponse,
  CityGetDataResponse
} from '@eoneom/api-client/src/endpoints/city/get'
import { getPlayerIdFromContext } from '#web/helpers'
import {
  CityGetQuery,
  CityGetQueryResponse
} from '#query/city/get'

export const cityGetHandler = async (
  req: Request<CityGetRequest>,
  res: Response<CityGetResponse>,
  next: NextFunction
) => {
  const city_id = req.params.city_id
  if (!city_id) {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.CITY_ID_NOT_FOUND
    })
  }

  try {
    const player_id = getPlayerIdFromContext(res)
    const result = await new CityGetQuery().run({
      player_id,
      city_id
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
  city,
  maximum_building_levels,
  building_levels_used,
  earnings_per_second,
  pre_cell_earnings_per_second,
  cell_resource_coefficient,
  cell,
  resource_stock,
  warehouses_capacity,
  warehouse_space_remaining,
  warehouse_full_in_seconds,
  energy,
  pre_cell_energy,
  neutral_photovoltaic_energy,
  cell_solar_coefficient,
  photovoltaic_optimization_level,
  energy_consumption,
  production_energy_ratio }: CityGetQueryResponse): CityGetDataResponse => {
  return {
    id: city.id,
    name: city.name,
    plastic: resource_stock.plastic,
    mushroom: resource_stock.mushroom,
    plasma: resource_stock.plasma,
    energy,
    pre_cell_energy,
    neutral_photovoltaic_energy,
    cell_solar_coefficient,
    photovoltaic_optimization_level,
    energy_consumption,
    production_energy_ratio,
    maximum_building_levels,
    building_levels_used,
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
    warehouse_space_remaining: {
      plastic: warehouse_space_remaining.plastic,
      mushroom: warehouse_space_remaining.mushroom
    },
    warehouse_full_in_seconds: {
      plastic: warehouse_full_in_seconds.plastic,
      mushroom: warehouse_full_in_seconds.mushroom
    },
    coordinates: {
      x: cell.coordinates.x,
      y: cell.coordinates.y
    }
  }
}

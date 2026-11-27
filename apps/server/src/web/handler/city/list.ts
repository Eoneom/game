import {
  NextFunction,
  Request,
  Response
} from 'express'
import {
  CityListResponse,
  CityListDataResponse
} from '@eoneom/api-client/src/endpoints/city/list'
import { getPlayerIdFromContext } from '#web/helpers'
import {
  CityListQuery,
  CityListQueryResponse
} from '#query/city/list'

export const cityListHandler = async (
  req: Request,
  res: Response<CityListResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const result = await new CityListQuery().run({ player_id })
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
  cities,
  cells,
  count_limit
}: CityListQueryResponse): CityListDataResponse => {
  const cities_response: CityListDataResponse['cities'] = cities.map((city, index) => {
    const { coordinates } = cells[index]
    return {
      id: city.id,
      name: city.name,
      coordinates: {
        x: coordinates.x,
        y: coordinates.y
      },
    }
  })

  return {
    cities: cities_response,
    count_limit
  }
}

import { RequestError } from '@eoneom/api-client'
import {
  NextFunction,
  Request,
  Response
} from 'express'
import {
  BuildingGetRequest,
  BuildingGetDataResponse,
  BuildingGetResponse
} from '@eoneom/api-client/src/endpoints/building/get'
import { getPlayerIdFromContext } from '#web/helpers'
import {
  BuildingGetQuery,
  BuildingGetQueryResponse
} from '#query/building/get'

export const buildingGetHandler = async (
  req: Request<BuildingGetRequest>,
  res: Response<BuildingGetResponse>,
  next: NextFunction
) => {
  const city_id = req.params.city_id
  if (!city_id) {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.CITY_ID_NOT_FOUND
    })
  }

  const building_code = req.params.building_code
  if (!building_code) {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.BUILDING_CODE_NOT_FOUND
    })
  }

  try {
    const player_id = getPlayerIdFromContext(res)
    const result = await new BuildingGetQuery().run({
      city_id,
      building_code,
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
  building,
  cost,
  requirement,
  metadata,
  upgrade_at,
  upgrade_started_at,
}: BuildingGetQueryResponse): BuildingGetDataResponse => {
  const base = {
    code: building.code,
    level: building.level,
    upgrade_cost: {
      plastic: cost.resource.plastic,
      mushroom: cost.resource.mushroom,
      duration: cost.duration
    },
    requirement: {
      buildings: requirement.buildings,
      technologies: requirement.technologies
    },
    metadata
  }
  if (upgrade_at == null || upgrade_started_at == null) {
    return base
  }
  return {
    ...base,
    upgrade_at,
    upgrade_started_at,
  }
}

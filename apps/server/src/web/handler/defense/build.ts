import { RequestError } from '@eoneom/api-client'
import {
  NextFunction, Request, Response
} from 'express'
import {
  DefenseBuildRequest, DefenseBuildResponse
} from '@eoneom/api-client/src/endpoints/defense/build'
import { getPlayerIdFromContext } from '#web/helpers'
import { buildDefense } from '#app/command/defense/build'
import { DefenseCode } from '#core/defense/constant/code'

const DEFENSE_CODE_VALUES = new Set<string>(Object.values(DefenseCode))

export const defenseBuildHandler = async (
  req: Request<DefenseBuildRequest>,
  res: Response<DefenseBuildResponse>,
  next: NextFunction
) => {
  const city_id = req.body.city_id
  if (!city_id) {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.CITY_ID_NOT_FOUND
    })
  }

  const count = req.body.count
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 1) {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.COUNT_NOT_FOUND
    })
  }

  const defense_code = req.body.defense_code
  if (typeof defense_code !== 'string' || !DEFENSE_CODE_VALUES.has(defense_code)) {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.DEFENSE_CODE_NOT_FOUND
    })
  }

  try {
    const player_id = getPlayerIdFromContext(res)
    await buildDefense({
      city_id,
      count,
      player_id,
      defense_code: defense_code as DefenseCode
    })
    const response: DefenseBuildResponse = { status: 'ok' }
    return res.status(200).json(response)
  } catch (err) {
    next(err)
  }
}

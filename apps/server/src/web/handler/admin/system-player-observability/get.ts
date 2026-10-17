import {
  NextFunction,
  Request,
  Response,
} from 'express'
import {
  AdminSystemPlayerObservabilityResponse,
  AdminSystemPlayerObservabilityDataResponse,
} from '@eoneom/api-client/src/endpoints/admin/system-player-observability'
import { getPlayerIdFromContext } from '#web/helpers'
import {
  isObservabilityAdmin,
  listSystemControlledPlayersForObservability,
} from '#app/query/admin/observability-access'

export const adminSystemPlayerObservabilityGetHandler = async (
  req: Request,
  res: Response<AdminSystemPlayerObservabilityResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const is_admin = await isObservabilityAdmin({ player_id })

    const data: AdminSystemPlayerObservabilityDataResponse = { is_admin }
    if (is_admin) {
      data.system_players = await listSystemControlledPlayersForObservability()
    }

    return res.json({
      status: 'ok',
      data,
    })
  } catch (err) {
    next(err)
  }
}

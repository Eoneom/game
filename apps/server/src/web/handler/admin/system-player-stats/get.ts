import {
  NextFunction,
  Request,
  Response,
} from 'express'
import {
  AdminSystemPlayerStatsResponse,
  AdminSystemPlayerStatsDataResponse,
} from '@eoneom/api-client/src/endpoints/admin/system-player-stats'
import { listSystemPlayerStatsSnapshots } from '#app/query/admin/system-player-stats'

export const adminSystemPlayerStatsGetHandler = async (
  req: Request,
  res: Response<AdminSystemPlayerStatsResponse>,
  next: NextFunction
) => {
  try {
    const players = await listSystemPlayerStatsSnapshots()
    const data: AdminSystemPlayerStatsDataResponse = { players }

    return res.json({
      status: 'ok',
      data,
    })
  } catch (err) {
    next(err)
  }
}

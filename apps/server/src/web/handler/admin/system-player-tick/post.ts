import {
  NextFunction,
  Request,
  Response,
} from 'express'
import {
  AdminForceSystemPlayerTickResponse,
  AdminForceSystemPlayerTickDataResponse,
} from '@eoneom/api-client/src/endpoints/admin/system-player-tick'
import { forceSystemPlayerTick } from '#command/admin/force-system-player-tick'

export const adminForceSystemPlayerTickPostHandler = async (
  req: Request,
  res: Response<AdminForceSystemPlayerTickResponse>,
  next: NextFunction
) => {
  try {
    const result = await forceSystemPlayerTick()
    const data: AdminForceSystemPlayerTickDataResponse = {
      tick_index: result.tick_index,
      next_tick_index: result.next_tick_index,
      next_execute_at: result.next_execute_at,
      system_player_count: result.system_player_count,
    }

    return res.json({
      status: 'ok',
      data,
    })
  } catch (err) {
    next(err)
  }
}

import { AdminError } from '#core/admin/error'
import { getPlayerIdFromContext } from '#web/helpers'
import { isObservabilityAdmin } from '#app/query/admin/observability-access'
import {
  NextFunction, Request, Response
} from 'express'

export const adminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const is_admin = await isObservabilityAdmin({ player_id })
    if (!is_admin) {
      throw new Error(AdminError.FORBIDDEN)
    }

    next()
  } catch (err) {
    next(err)
  }
}

import { RequestError } from '@eoneom/api-client'
import { authorizeAuth } from '#app/command/auth/authorize'
import { now } from '#shared/time'
import {
  NextFunction, Request, Response
} from 'express'

export const authMiddleware = async (req: Request<unknown>, res: Response<unknown>, next: NextFunction) => {
  const token = req.headers.authorization
  if (!token) {
    return res.status(401).json({
      status: 'nok',
      error_code: RequestError.TOKEN_NOT_FOUND
    })
  }
  try {
    const { player_id } = await authorizeAuth({
      token,
      action_at: now()
    })

    res.locals.player_id = player_id

    next()
  } catch (err) {
    next(err)
  }
}

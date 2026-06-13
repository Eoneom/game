import { RequestError } from '@eoneom/api-client'
import {
  NextFunction, Request, Response
} from 'express'
import {
  LoginRequest, LoginResponse
} from '@eoneom/api-client/src/endpoints/player/login'
import { loginAuth } from '#command/auth/login'

export const loginHandler = async (
  req: Request<LoginRequest>,
  res: Response<LoginResponse>,
  next: NextFunction
) => {
  const player_name = req.body.player_name
  if (!player_name) {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.PLAYER_NAME_NOT_FOUND
    })
  }

  try {
    const { token } = await loginAuth({ player_name })

    return res.status(200).send({
      status: 'ok',
      data: { token }
    })
  } catch (err) {
    next(err)
  }
}

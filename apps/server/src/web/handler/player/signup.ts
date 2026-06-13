import { RequestError } from '@eoneom/api-client'
import {
  NextFunction, Request, Response
} from 'express'
import {
  SignupRequest, SignupResponse
} from '@eoneom/api-client/src/endpoints/player/signup'
import { signupAuth } from '#command/auth/signup'

export const signupHandler = async (
  req: Request<SignupRequest>,
  res: Response<SignupResponse>,
  next: NextFunction
) => {
  const player_name = req.body.player_name
  if (!player_name) {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.PLAYER_NAME_NOT_FOUND
    })
  }

  const city_name = req.body.city_name
  if (!city_name) {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.CITY_NAME_NOT_FOUND
    })
  }

  try {
    const {
      player_id,
      city_id
    } = await signupAuth({
      player_name,
      city_name
    })
    return res.status(200).send({
      status: 'ok',
      data: {
        player_id,
        city_id
      }
    })
  } catch (err) {
    next(err)
  }
}

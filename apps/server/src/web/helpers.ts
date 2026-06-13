import { RequestError } from '@eoneom/api-client'
import { Response } from 'express'

export const getPlayerIdFromContext = (res: Response): string => {
  const player_id = res.locals.player_id
  if (!player_id) {
    throw new Error(RequestError.PLAYER_ID_NOT_IN_CONTEXT)
  }

  return player_id
}

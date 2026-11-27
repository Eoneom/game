import {
  NextFunction,
  Request,
  Response
} from 'express'
import { CommunicationListBlockResponse } from '@eoneom/api-client/src/endpoints/communication/block/list'
import { getPlayerIdFromContext } from '#web/helpers'
import { CommunicationListBlockQuery } from '#query/communication/block/list'

export const communicationListBlockHandler = async (
  req: Request,
  res: Response<CommunicationListBlockResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const players = await new CommunicationListBlockQuery().run({ player_id })

    return res.json({
      status: 'ok',
      data: { players }
    })
  } catch (err) {
    next(err)
  }
}

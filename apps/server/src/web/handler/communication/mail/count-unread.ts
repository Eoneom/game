import {
  NextFunction,
  Request,
  Response
} from 'express'
import { CommunicationCountUnreadMailResponse } from '@eoneom/api-client/src/endpoints/communication/mail/count-unread'
import { getPlayerIdFromContext } from '#web/helpers'
import { CommunicationCountUnreadMailQuery } from '#query/communication/mail/count-unread'

export const communicationCountUnreadMailHandler = async (
  req: Request,
  res: Response<CommunicationCountUnreadMailResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const count = await new CommunicationCountUnreadMailQuery().run({ player_id })

    return res.json({
      status: 'ok',
      data: { count }
    })
  } catch (err) {
    next(err)
  }
}

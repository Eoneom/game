import { RequestError } from '@eoneom/api-client'
import {
  NextFunction,
  Request,
  Response
} from 'express'
import { CommunicationMarkMailResponse } from '@eoneom/api-client/src/endpoints/communication/mail/mark'
import { getPlayerIdFromContext } from '#web/helpers'
import { markCommunicationMail } from '#app/command/communication/mail/mark'

export const communicationMarkMailHandler = async (
  req: Request,
  res: Response<CommunicationMarkMailResponse>,
  next: NextFunction
) => {
  const mail_id = req.body?.mail_id
  if (!mail_id || typeof mail_id !== 'string') {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.MAIL_ID_NOT_FOUND
    })
  }

  const was_read = req.body.was_read
  if (was_read === undefined || was_read === null) {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.WAS_READ_NOT_FOUND
    })
  }

  try {
    const player_id = getPlayerIdFromContext(res)
    await markCommunicationMail({
      player_id,
      mail_id,
      was_read: Boolean(was_read)
    })

    return res.json({ status: 'ok' })
  } catch (err) {
    next(err)
  }
}

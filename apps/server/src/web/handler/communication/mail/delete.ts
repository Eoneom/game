import { RequestError } from '@eoneom/api-client'
import {
  NextFunction,
  Request,
  Response
} from 'express'
import { CommunicationDeleteMailResponse } from '@eoneom/api-client/src/endpoints/communication/mail/delete'
import { getPlayerIdFromContext } from '#web/helpers'
import { deleteCommunicationMail } from '#app/command/communication/mail/delete'

export const communicationDeleteMailHandler = async (
  req: Request,
  res: Response<CommunicationDeleteMailResponse>,
  next: NextFunction
) => {
  const mail_id = req.params.mail_id
  if (!mail_id || typeof mail_id !== 'string') {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.MAIL_ID_NOT_FOUND
    })
  }

  try {
    const player_id = getPlayerIdFromContext(res)
    await deleteCommunicationMail({
      player_id,
      mail_id
    })

    return res.json({ status: 'ok' })
  } catch (err) {
    next(err)
  }
}

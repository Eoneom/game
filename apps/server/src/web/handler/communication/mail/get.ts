import { RequestError } from '@eoneom/api-client'
import {
  NextFunction,
  Request,
  Response
} from 'express'
import { CommunicationGetMailResponse } from '@eoneom/api-client/src/endpoints/communication/mail/get'
import { getPlayerIdFromContext } from '#web/helpers'
import { mapMailItem } from '#web/handler/communication/mail/mapper'
import { CommunicationGetMailQuery } from '#query/communication/mail/get'

export const communicationGetMailHandler = async (
  req: Request,
  res: Response<CommunicationGetMailResponse>,
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
    const {
      mail, players 
    } = await new CommunicationGetMailQuery().run({
      player_id,
      mail_id
    })

    return res.json({
      status: 'ok',
      data: {
        ...mapMailItem({
          mail,
          players,
          player_id
        }),
        body: mail.body
      }
    })
  } catch (err) {
    next(err)
  }
}

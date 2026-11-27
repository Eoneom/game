import {
  NextFunction,
  Request,
  Response
} from 'express'
import { CommunicationSendMailResponse } from '@eoneom/api-client/src/endpoints/communication/mail/send'
import { getPlayerIdFromContext } from '#web/helpers'
import { sendCommunicationMail } from '#app/command/communication/mail/send'

export const communicationSendMailHandler = async (
  req: Request,
  res: Response<CommunicationSendMailResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const in_reply_to = typeof req.body?.in_reply_to === 'string' && req.body.in_reply_to
      ? req.body.in_reply_to
      : null
    const { mail_id } = await sendCommunicationMail({
      sender_id: player_id,
      recipient_name: req.body?.recipient_name,
      subject: req.body?.subject,
      body: req.body?.body,
      in_reply_to
    })

    return res.json({
      status: 'ok',
      data: { mail_id }
    })
  } catch (err) {
    next(err)
  }
}

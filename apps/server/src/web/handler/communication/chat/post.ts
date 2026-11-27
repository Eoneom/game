import {
  NextFunction,
  Request,
  Response
} from 'express'
import { CommunicationPostChatMessageResponse } from '@eoneom/api-client/src/endpoints/communication/chat/post'
import { getPlayerIdFromContext } from '#web/helpers'
import { postCommunicationChatMessage } from '#app/command/communication/chat/post'

export const communicationPostChatMessageHandler = async (
  req: Request,
  res: Response<CommunicationPostChatMessageResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const message = await postCommunicationChatMessage({
      player_id,
      channel: String(req.params.channel ?? ''),
      body: req.body?.body
    })

    return res.json({
      status: 'ok',
      data: message
    })
  } catch (err) {
    next(err)
  }
}

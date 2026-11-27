import {
  NextFunction,
  Request,
  Response
} from 'express'
import { CommunicationChatHistoryResponse } from '@eoneom/api-client/src/endpoints/communication/chat/history'
import { getPlayerIdFromContext } from '#web/helpers'
import { CommunicationChatHistoryQuery } from '#query/communication/chat/history'

const parseLimit = (raw: Request['query']['limit']): number | undefined => {
  const value = typeof raw === 'string' ? Number.parseInt(raw, 10) : Number.NaN
  return Number.isFinite(value) ? value : undefined
}

export const communicationChatHistoryHandler = async (
  req: Request,
  res: Response<CommunicationChatHistoryResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const before = typeof req.query.before === 'string' && req.query.before ? req.query.before : undefined
    const {
      messages, has_more 
    } = await new CommunicationChatHistoryQuery().run({
      player_id,
      channel: String(req.params.channel ?? ''),
      before,
      limit: parseLimit(req.query.limit)
    })

    return res.json({
      status: 'ok',
      data: {
        messages,
        has_more,
        viewer_player_id: player_id
      }
    })
  } catch (err) {
    next(err)
  }
}

import {
  NextFunction,
  Request,
  Response
} from 'express'
import { CommunicationListMailResponse } from '@eoneom/api-client/src/endpoints/communication/mail/list'
import { getPlayerIdFromContext } from '#web/helpers'
import { mapMailItem } from '#web/handler/communication/mail/mapper'
import {
  COMMUNICATION_LIST_MAIL_PAGE_SIZE,
  CommunicationListMailQuery
} from '#query/communication/mail/list'

const parsePage = (raw: Request['query']['page']): number => {
  const value = typeof raw === 'string' ? Number.parseInt(raw, 10) : Number.NaN
  return Number.isFinite(value) && value >= 1 ? value : 1
}

export const communicationListMailHandler = async (
  req: Request,
  res: Response<CommunicationListMailResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const box = req.query.box === 'sent' ? 'sent' : 'inbox'
    const {
      mails, players, total 
    } = await new CommunicationListMailQuery().run({
      player_id,
      box,
      page: parsePage(req.query.page)
    })

    return res.json({
      status: 'ok',
      data: {
        mails: mails.map(mail => mapMailItem({
          mail,
          players,
          player_id
        })),
        total,
        page_size: COMMUNICATION_LIST_MAIL_PAGE_SIZE
      }
    })
  } catch (err) {
    next(err)
  }
}

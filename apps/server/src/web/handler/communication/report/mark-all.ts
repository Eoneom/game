import {
  NextFunction,
  Request,
  Response
} from 'express'
import { CommunicationMarkAllReportsResponse } from '@eoneom/api-client/src/endpoints/communication/report/mark-all'
import { getPlayerIdFromContext } from '#web/helpers'
import { markAllCommunicationReports } from '#app/command/communication/report/mark-all'

export const communicationMarkAllReportsHandler = async (
  req: Request,
  res: Response<CommunicationMarkAllReportsResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    await markAllCommunicationReports({ player_id })

    return res.json({ status: 'ok' })
  } catch (err) {
    next(err)
  }
}

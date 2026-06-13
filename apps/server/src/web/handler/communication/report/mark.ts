import { RequestError } from '@eoneom/api-client'
import {
  NextFunction,
  Request,
  Response
} from 'express'
import { CommunicationMarkReportResponse } from '@eoneom/api-client/src/endpoints/communication/report/mark'
import { getPlayerIdFromContext } from '#web/helpers'
import { markCommunicationReport } from '#app/command/communication/report/mark'

export const communicationMarkReportHandler = async (
  req: Request,
  res: Response<CommunicationMarkReportResponse>,
  next: NextFunction
) => {
  const report_id = req.body.report_id
  if (!report_id) {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.REPORT_ID_NOT_FOUND
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
    await markCommunicationReport({
      player_id,
      report_id,
      was_read: Boolean(was_read)
    })

    return res.json({ status: 'ok' })
  } catch (err) {
    next(err)
  }
}

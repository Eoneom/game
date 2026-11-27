import { RequestError } from '@eoneom/api-client'
import {
  NextFunction,
  Request,
  Response
} from 'express'
import { CommunicationCreateAbuseReportResponse } from '@eoneom/api-client/src/endpoints/communication/abuse-report/create'
import { getPlayerIdFromContext } from '#web/helpers'
import { createCommunicationAbuseReport } from '#app/command/communication/abuse-report/create'
import { isAbuseReportKind } from '#core/communication/abuse-report/kind'

export const communicationCreateAbuseReportHandler = async (
  req: Request,
  res: Response<CommunicationCreateAbuseReportResponse>,
  next: NextFunction
) => {
  const kind = req.body?.kind
  if (!isAbuseReportKind(kind)) {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.KIND_NOT_FOUND
    })
  }

  const message_id = req.body.message_id
  if (!message_id || typeof message_id !== 'string') {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.MESSAGE_ID_NOT_FOUND
    })
  }

  try {
    const reporter_id = getPlayerIdFromContext(res)
    await createCommunicationAbuseReport({
      reporter_id,
      kind,
      message_id,
      reason: req.body.reason
    })

    return res.json({ status: 'ok' })
  } catch (err) {
    next(err)
  }
}

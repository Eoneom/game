import { RequestError } from '@eoneom/api-client'
import {
  NextFunction,
  Request,
  Response
} from 'express'
import {
  CommunicationGetReportDataResponse,
  CommunicationGetReportResponse
} from '@eoneom/api-client/src/endpoints/communication/report/get'
import { getPlayerIdFromContext } from '#web/helpers'
import {
  CommunicationGetReportQuery,
  CommunicationGetReportQueryResponse
} from '#query/communication/report/get'

export const communicationGetReportHandler = async (
  req: Request,
  res: Response<CommunicationGetReportResponse>,
  next: NextFunction
) => {
  const report_id = req.params.report_id
  if (!report_id) {
    return res.status(400).json({
      status: 'nok',
      error_code: RequestError.REPORT_ID_NOT_FOUND
    })
  }

  try {
    const player_id = getPlayerIdFromContext(res)
    const result = await new CommunicationGetReportQuery().run({
      player_id,
      report_id
    })
    const response = response_mapper(result)

    return res.json({
      status: 'ok',
      data: response
    })
  } catch (err) {
    next(err)
  }
}

const response_mapper = ({ report }: CommunicationGetReportQueryResponse): CommunicationGetReportDataResponse => {
  const report_response: CommunicationGetReportDataResponse = {
    id: report.id,
    type: report.type,
    destination: report.destination,
    origin: report.origin,
    recorded_at: report.recorded_at,
    was_read: report.was_read,
    troops: report.troops.map(troop => ({
      code:troop.code,
      count: troop.count
    })),
    resources: {
      plastic: report.resources.plastic,
      mushroom: report.resources.mushroom,
      plasma: report.resources.plasma,
    },
    remaining_resources: {
      plastic: report.remaining_resources.plastic,
      mushroom: report.remaining_resources.mushroom,
      plasma: report.remaining_resources.plasma,
    },
  }

  return report_response
}

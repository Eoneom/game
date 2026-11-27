import { ErrorResponse } from '@eoneom/api-client/src/response'
import {
  NextFunction, Request, Response
} from 'express'
import { AppLogger } from '#app/port/logger'
import { CommunicationError } from '#core/communication/error'

/** Domain errors answered with a specific HTTP status; every other error keeps 200 + `nok`. */
const ERROR_HTTP_STATUS: Record<string, number> = { [CommunicationError.RATE_LIMITED]: 429 }

const errorHttpStatus = (error_code: string): number => ERROR_HTTP_STATUS[error_code] ?? 200

export const createErrorMiddleware = (log: AppLogger) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (err: Error, _req: Request, res: Response<ErrorResponse>, _next: NextFunction) => {
    log.error(err.message, { stack: err.stack })

    return res.status(errorHttpStatus(err.message)).json({
      status: 'nok',
      error_code: err.message
    })
  }
}

import { ErrorResponse } from '@eoneom/api-client/src/response'
import {
  NextFunction, Request, Response
} from 'express'
import { AppLogger } from '#app/port/logger'

export const createErrorMiddleware = (log: AppLogger) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (err: Error, _req: Request, res: Response<ErrorResponse>, _next: NextFunction) => {
    log.error(err.message, { stack: err.stack })

    return res.status(200).json({
      status: 'nok',
      error_code: err.message
    })
  }
}

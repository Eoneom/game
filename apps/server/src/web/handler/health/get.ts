import {
  NextFunction,
  Request,
  Response
} from 'express'

export type HealthResponse = {
  status: 'ok'
}

export const healthGetHandler = (
  _req: Request,
  res: Response<HealthResponse>,
  _next: NextFunction
) => {
  res.status(200).json({ status: 'ok' })
}

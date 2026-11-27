import {
  NextFunction,
  Request,
  Response
} from 'express'
import {
  ExchangeBookResponse,
  ExchangeTradesResponse
} from '@eoneom/api-client/src/endpoints/exchange/book'
import { getPlayerIdFromContext } from '#web/helpers'
import { ExchangeBookQuery } from '#query/exchange/book'
import { ExchangeTradesQuery } from '#query/exchange/trades'

/** `GET /exchange/book?resource=` (slice 035). */
export const exchangeBookHandler = async (
  req: Request,
  res: Response<ExchangeBookResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const data = await new ExchangeBookQuery().run({
      player_id,
      resource: req.query.resource
    })

    return res.json({
      status: 'ok',
      data
    })
  } catch (err) {
    next(err)
  }
}

/** `GET /exchange/trades?resource=` (slice 035). */
export const exchangeTradesHandler = async (
  req: Request,
  res: Response<ExchangeTradesResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const data = await new ExchangeTradesQuery().run({
      player_id,
      resource: req.query.resource
    })

    return res.json({
      status: 'ok',
      data
    })
  } catch (err) {
    next(err)
  }
}

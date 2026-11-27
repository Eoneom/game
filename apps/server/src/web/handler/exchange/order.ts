import {
  NextFunction,
  Request,
  Response
} from 'express'
import {
  ExchangeCancelOrderResponse,
  ExchangeEstimateOrderResponse,
  ExchangeMineResponse,
  ExchangePlaceOrderResponse
} from '@eoneom/api-client/src/endpoints/exchange/order'
import { ExchangeOrder } from '@eoneom/api-client/src/endpoints/exchange/shared'
import { getPlayerIdFromContext } from '#web/helpers'
import { placeExchangeOrder } from '#app/command/exchange/place'
import { cancelExchangeOrder } from '#app/command/exchange/cancel'
import { ExchangeEstimateQuery } from '#query/exchange/estimate'
import {
  ExchangeMineOrder,
  ExchangeMineQuery
} from '#query/exchange/mine'

const toOrderResponse = ({
  order,
  city_name,
  reserved_resources,
  reserved_carriers
}: ExchangeMineOrder): ExchangeOrder => ({
  id: order.id,
  city_id: order.city_id,
  city_name,
  side: order.side,
  resource: order.resource,
  lots: order.lots,
  filled_lots: order.filled_lots,
  price: order.price,
  status: order.status,
  created_at: order.created_at,
  closed_at: order.closed_at,
  expires_at: order.expires_at,
  reserved_resources,
  reserved_carriers: reserved_carriers.map(reservation => ({
    code: reservation.troop_code,
    count: reservation.count
  })),
})

/** `POST /exchange/order` (slice 035). */
export const exchangePlaceOrderHandler = async (
  req: Request,
  res: Response<ExchangePlaceOrderResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const result = await placeExchangeOrder({
      player_id,
      city_id: req.body?.city_id,
      side: req.body?.side,
      resource: req.body?.resource,
      lots: req.body?.lots,
      price: req.body?.price,
    })

    return res.json({
      status: 'ok',
      data: result
    })
  } catch (err) {
    next(err)
  }
}

/** `POST /exchange/order/estimate`: reservation and typical delivery time of an order form (slice 035). */
export const exchangeEstimateOrderHandler = async (
  req: Request,
  res: Response<ExchangeEstimateOrderResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const result = await new ExchangeEstimateQuery().run({
      player_id,
      city_id: req.body?.city_id,
      side: req.body?.side,
      resource: req.body?.resource,
      lots: req.body?.lots,
      price: req.body?.price,
    })

    return res.json({
      status: 'ok',
      data: result
    })
  } catch (err) {
    next(err)
  }
}

/** `DELETE /exchange/order/:order_id` (slice 035). */
export const exchangeCancelOrderHandler = async (
  req: Request,
  res: Response<ExchangeCancelOrderResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    await cancelExchangeOrder({
      player_id,
      order_id: String(req.params.order_id)
    })

    return res.json({ status: 'ok' })
  } catch (err) {
    next(err)
  }
}

/** `GET /exchange/order/mine` (slice 035). */
export const exchangeMineHandler = async (
  _req: Request,
  res: Response<ExchangeMineResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const {
      open, closed, trading_posts
    } = await new ExchangeMineQuery().run({ player_id })

    return res.json({
      status: 'ok',
      data: {
        open: open.map(toOrderResponse),
        closed: closed.map(toOrderResponse),
        trading_posts,
      }
    })
  } catch (err) {
    next(err)
  }
}

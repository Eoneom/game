import { Factory } from '#adapter/factory'
import {
  emitExchangeBookUpdated,
  releaseExchangeOrder,
  runInExchangeMarket
} from '#app/command/exchange/shared'
import { runCommand } from '#command/run'
import { ExchangeError } from '#core/exchange/error'
import { ExchangeOrderStatus } from '#core/exchange/value/order-status'
import { now } from '#shared/time'

/**
 * `DELETE /exchange/order/:order_id` (slice 035): cancels the unfilled rest of an own open order; its escrow returns
 * to the order city's stock and its carriers are released. Convoys already sent continue.
 */
export async function cancelExchangeOrder({
  player_id,
  order_id,
}: {
  player_id: string
  order_id: string
}): Promise<void> {
  const order = await Factory.getRepository().exchange.findOrder(order_id)
  if (!order || !order.isOwnedBy(player_id)) {
    throw new Error(ExchangeError.ORDER_NOT_FOUND)
  }

  await runInExchangeMarket(order, () => runCommand('exchange:order:cancel', async () => {
    const locked = await Factory.getRepository().exchange.findOrderForUpdate(order_id)
    if (!locked?.isOpen()) {
      throw new Error(ExchangeError.ORDER_NOT_OPEN)
    }
    await releaseExchangeOrder({
      order: locked,
      status: ExchangeOrderStatus.CANCELLED,
      closed_at: now()
    })
  }))

  emitExchangeBookUpdated([ order ])
}

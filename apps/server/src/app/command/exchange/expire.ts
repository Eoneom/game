import { Factory } from '#adapter/factory'
import {
  emitExchangeBookUpdated,
  ExchangeMarket,
  releaseExchangeOrder,
  runInExchangeMarket
} from '#app/command/exchange/shared'
import { EXCHANGE_ORDER_EXPIRE_INTERVAL_MS } from '#app/scheduling/intervals'
import { runCommand } from '#command/run'
import { EXCHANGE_ORDER_LIFETIME_MS } from '#core/exchange/constant/limits'
import { ExchangeOrderStatus } from '#core/exchange/value/order-status'
import { now } from '#shared/time'

/**
 * Hourly job `exchange.order.expire` (slice 035): open orders older than 7 days expire with the same release as a
 * cancel, one order per transaction under its market lock; then the job reschedules itself.
 */
export async function expireExchangeOrders(): Promise<void> {
  const repository = Factory.getRepository()
  const logger = Factory.getLogger('app:command:exchange:expire')
  const expired_at = now()

  const candidates = await repository.exchange.listOpenCreatedBefore(expired_at - EXCHANGE_ORDER_LIFETIME_MS)
  const markets: ExchangeMarket[] = []
  for (const candidate of candidates) {
    try {
      const expired = await runInExchangeMarket(candidate, () => runCommand('exchange:order:expire', async () => {
        const order = await repository.exchange.findOrderForUpdate(candidate.id)
        if (!order?.isOpen()) {
          return false
        }
        await releaseExchangeOrder({
          order,
          status: ExchangeOrderStatus.EXPIRED,
          closed_at: expired_at
        })
        return true
      }))
      if (expired) {
        markets.push(candidate)
      }
    } catch (err) {
      // One failing order must not block the others nor the next run.
      logger.error('exchange order expiry failed', {
        order_id: candidate.id,
        err
      })
    }
  }

  logger.info('exchange orders expired', { count: markets.length })
  emitExchangeBookUpdated(markets)

  await Factory.getJobQueue().scheduleExchangeOrderExpire({ execute_at: expired_at + EXCHANGE_ORDER_EXPIRE_INTERVAL_MS })
}

import { ExchangeSide, exchange_lot_size, type ExchangeResource } from '@eoneom/api-client'

import { formatResourceAmount } from '#exchange/translations'
import type { CityStock } from '#exchange/quick-trade/max-lots'

type QuickTradeIssueCode =
  | 'no-trading-post'
  | 'lots-invalid'
  | 'price-invalid'
  | 'order-limit'
  | 'not-enough-stock'
  | 'not-enough-carriers'
  | 'estimate-failed'

interface QuickTradeIssue {
  code: QuickTradeIssueCode
  message: string
}

/** The estimate fields the rules read (`POST /exchange/order/estimate`). */
interface EstimateFacts {
  enough_resources: boolean
  reserved_carriers: unknown[] | null
  carrier_load: number
  available_carrier_capacity: number
}

interface QuickTradeValidationInput {
  side: ExchangeSide
  resource: ExchangeResource
  /** Number of the caller's cities with a trading post. */
  tradingPostCount: number
  /** Parsed fields: `null` when not an integer ≥ 1. */
  lots: number | null
  price: number | null
  /** Open orders and limit of the selected city (estimate, else `trading_posts`). */
  openOrderCount: number | null
  openOrderLimit: number | null
  stock: CityStock | undefined
  /** The estimate of the order being edited; `undefined` while loading. */
  estimate: EstimateFacts | undefined
  estimateFailed: boolean
}

/** Integer ≥ 1 from a text field, else `null`. */
export const parsePositiveInteger = (value: string): number | null => {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : null
}

export const NO_TRADING_POST_MESSAGE = 'Construisez un Comptoir d\'échange pour accéder à la bourse de faction.'

/**
 * First failing rule of the quick trade (slice 046), in the order of the spec table, which mirrors the server
 * checks of slice 035; `null` when the order can be placed (the estimate may still be loading).
 */
export const firstQuickTradeIssue = (input: QuickTradeValidationInput): QuickTradeIssue | null => {
  const { side, resource, lots, price, estimate } = input
  if (input.tradingPostCount === 0) {
    return { code: 'no-trading-post', message: NO_TRADING_POST_MESSAGE }
  }
  if (lots === null) {
    return { code: 'lots-invalid', message: 'La quantité doit être un nombre entier de lots (au moins 1).' }
  }
  if (price === null) {
    return { code: 'price-invalid', message: 'Le prix doit être un nombre entier d\'eau pure par lot (au moins 1).' }
  }
  if (input.openOrderCount !== null && input.openOrderLimit !== null && input.openOrderCount >= input.openOrderLimit) {
    return {
      code: 'order-limit',
      message: `Ce comptoir a déjà ${input.openOrderCount} ordre${input.openOrderCount > 1 ? 's' : ''} ouvert${input.openOrderCount > 1 ? 's' : ''} sur ${input.openOrderLimit} : annulez-en un ou améliorez le comptoir.`,
    }
  }
  if (input.estimateFailed) {
    return { code: 'estimate-failed', message: 'Estimation indisponible, réessayez.' }
  }
  if (!estimate) return null
  if (!estimate.enough_resources) {
    return { code: 'not-enough-stock', message: stockMessage({ side, resource, lots, price, stock: input.stock }) }
  }
  if (estimate.reserved_carriers === null) {
    return {
      code: 'not-enough-carriers',
      message: `Transporteurs insuffisants : capacité ${estimate.available_carrier_capacity} disponible, ${estimate.carrier_load} nécessaire. Recrutez des transporteurs ou libérez-en.`,
    }
  }
  return null
}

const stockMessage = ({ side, resource, lots, price, stock }: {
  side: ExchangeSide
  resource: ExchangeResource
  lots: number
  price: number
  stock: CityStock | undefined
}): string => {
  if (side === ExchangeSide.SELL) {
    const needed = lots * exchange_lot_size[resource]
    return stock
      ? `Stock insuffisant : ${formatResourceAmount(resource, stock[resource])} disponibles, ${needed} nécessaires.`
      : `Stock insuffisant : ${formatResourceAmount(resource, needed)} nécessaires.`
  }
  const needed = lots * price
  return stock
    ? `Eau pure insuffisante : ${stock.water} disponibles, ${needed} nécessaires.`
    : `Eau pure insuffisante : ${needed} nécessaires.`
}

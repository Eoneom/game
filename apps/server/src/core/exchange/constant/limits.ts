/** Open orders expire after 7 days (hourly job `exchange.order.expire`). */
export const EXCHANGE_ORDER_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000

/** Price levels per side in `GET /exchange/book`. */
export const EXCHANGE_BOOK_DEPTH = 10

/** Trades in `GET /exchange/trades` and closed orders in `GET /exchange/order/mine`. */
export const EXCHANGE_HISTORY_LIMIT = 50

/** Storage bound of `lots` and `price` (Postgres `integer`); not a game rule (no price bounds, slice 035). */
export const EXCHANGE_MAX_INTEGER = 2_147_483_647

/** Distance used for the delivery estimate when no other faction city exists (5 cells). */
export const EXCHANGE_FALLBACK_TYPICAL_DISTANCE = 5 * 10000

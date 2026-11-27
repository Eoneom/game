export const CITY_RESOURCES_GATHER_INTERVAL_MS = 5_000
export const OUTPOST_RESOURCES_GATHER_INTERVAL_MS = 5_000
export const REPORT_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000
export const CHAT_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000
/** Hourly `ranking.compute` snapshot (slice 034). */
export const RANKING_COMPUTE_INTERVAL_MS = 60 * 60 * 1000
/** Hourly `exchange.order.expire` (slice 035). */
export const EXCHANGE_ORDER_EXPIRE_INTERVAL_MS = 60 * 60 * 1000
export const SYSTEM_PLAYER_TICK_INTERVAL_MS = 60_000
/** Delay between chained combat round jobs; 0 = resolve all rounds in one burst. */
export const COMBAT_ROUND_INTERVAL_MS = 0

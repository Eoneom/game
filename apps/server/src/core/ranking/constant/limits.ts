/** Plasma is scarcer: one plasma weighs as much as five plastic or mushroom (slice 034). */
export const RANKING_PLASMA_WEIGHT = 5

/** `points = floor(value / RANKING_POINTS_DIVISOR)`. */
export const RANKING_POINTS_DIVISOR = 1000

export const RANKING_PAGE_SIZE = 50

/** Alliances are ranked only from this many members. */
export const RANKING_ALLIANCE_MIN_MEMBERS = 3

/** Hourly snapshots are kept for 7 days (real time). */
export const RANKING_SNAPSHOT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000

/** The rank change compares with the snapshot closest to 24 h before the latest one. */
export const RANKING_CHANGE_REFERENCE_MS = 24 * 60 * 60 * 1000

/** Maximum successful system-player commands committed in one tick (v1). */
export const SYSTEM_MAX_ACTIONS_PER_TICK = 10

/** Max `transport` intents prepended when permanent outpost stock is pressured. */
export const SYSTEM_MAX_OUTPOST_TRANSPORT_PREPENDS = 5

/** Permanent outposts below this count (with no temps) marks expansion as starved. */
export const SYSTEM_EXPANSION_STARVED_PERMANENT_OUTPOST_TARGET = 2

/** Max `base` intents prepended per tick when expansion-starved. */
export const SYSTEM_EXPANSION_STARVED_MAX_BASE_PREPENDS = 2

/** Max `deploy-outpost` intents prepended when outpost logistics are needed. */
export const SYSTEM_MAX_OUTPOST_DEPLOY_PREPENDS = 2

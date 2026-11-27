export const ALLIANCE_NAME_MIN_LENGTH = 3
export const ALLIANCE_NAME_MAX_LENGTH = 30

/** 3–5 characters `[A-Z0-9]`, stored uppercase. */
export const ALLIANCE_TAG_PATTERN = /^[A-Z0-9]{3,5}$/

export const ALLIANCE_DESCRIPTION_MAX_LENGTH = 1000

export const ALLIANCE_APPLICATION_MESSAGE_MAX_LENGTH = 500

/** Invitations expire after 7 days (real time, not scaled by the game time scale). */
export const ALLIANCE_INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** Cooldown after voluntarily leaving before joining or creating another alliance. */
export const ALLIANCE_LEAVE_COOLDOWN_MS = 24 * 60 * 60 * 1000

export const ALLIANCE_SEARCH_LIMIT = 20

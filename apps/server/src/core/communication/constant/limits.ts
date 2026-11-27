/** Length caps and rate limits for letters and chat (slice 032). */
export const MAIL_SUBJECT_MAX_LENGTH = 120
export const MAIL_BODY_MAX_LENGTH = 5000
export const CHAT_BODY_MAX_LENGTH = 500
export const ABUSE_REPORT_REASON_MAX_LENGTH = 500

export const MAIL_RATE_LIMIT_WINDOW_MS = 10_000
export const CHAT_RATE_LIMIT_WINDOW_MS = 2_000

export const CHAT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

export const CHAT_HISTORY_DEFAULT_LIMIT = 50
export const CHAT_HISTORY_MAX_LIMIT = 100

export const PLAYER_SEARCH_MIN_LENGTH = 2
export const PLAYER_SEARCH_MAX_RESULTS = 10

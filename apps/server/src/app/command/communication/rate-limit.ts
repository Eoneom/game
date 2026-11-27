import { Factory } from '#adapter/factory'
import { CommunicationError } from '#core/communication/error'

/** One sliding window per player and scope (`mail`, `chat:<channel>`), slice 032. */
export const assertCommunicationRateLimit = ({
  player_id,
  scope,
  window_ms
}: {
  player_id: string
  scope: string
  window_ms: number
}): void => {
  const allowed = Factory.getRateLimiter().tryConsume({
    key: `${player_id}:${scope}`,
    window_ms
  })
  if (!allowed) {
    throw new Error(CommunicationError.RATE_LIMITED)
  }
}

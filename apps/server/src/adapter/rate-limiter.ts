import { RateLimiter } from '#app/port/rate-limiter'
import { now } from '#shared/time'

/**
 * Sliding window kept in process memory (single server today, slice 032).
 * Moving to a shared store is part of the security pass (slice 038).
 */
export class RateLimiterInMemory implements RateLimiter {
  private hits = new Map<string, number[]>()
  private clock: () => number

  constructor({ clock = now }: { clock?: () => number } = {}) {
    this.clock = clock
  }

  tryConsume({
    key,
    window_ms,
    max = 1
  }: {
    key: string
    window_ms: number
    max?: number
  }): boolean {
    const at = this.clock()
    const recent = (this.hits.get(key) ?? []).filter(hit_at => at - hit_at < window_ms)

    if (recent.length >= max) {
      this.hits.set(key, recent)
      return false
    }

    recent.push(at)
    this.hits.set(key, recent)
    return true
  }
}

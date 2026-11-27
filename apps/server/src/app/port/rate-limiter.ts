export interface RateLimiter {
  /**
   * Records a hit for `key` and returns true when fewer than `max` hits fall within the last `window_ms`;
   * returns false (nothing recorded) otherwise.
   */
  tryConsume(args: { key: string, window_ms: number, max?: number }): boolean
}

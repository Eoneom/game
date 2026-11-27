import { RateLimiterInMemory } from './rate-limiter'

describe('RateLimiterInMemory', () => {
  let at: number
  let limiter: RateLimiterInMemory

  beforeEach(() => {
    at = 1_000_000
    limiter = new RateLimiterInMemory({ clock: () => at })
  })

  it('rejects a second hit within the window', () => {
    expect(limiter.tryConsume({
      key: 'mail:p1',
      window_ms: 10_000 
    })).toBe(true)
    at += 9_999
    expect(limiter.tryConsume({
      key: 'mail:p1',
      window_ms: 10_000 
    })).toBe(false)
  })

  it('accepts a hit once the window has slid past the previous one', () => {
    expect(limiter.tryConsume({
      key: 'mail:p1',
      window_ms: 10_000 
    })).toBe(true)
    at += 10_000
    expect(limiter.tryConsume({
      key: 'mail:p1',
      window_ms: 10_000 
    })).toBe(true)
  })

  it('does not record rejected hits', () => {
    expect(limiter.tryConsume({
      key: 'k',
      window_ms: 2_000 
    })).toBe(true)
    at += 1_500
    expect(limiter.tryConsume({
      key: 'k',
      window_ms: 2_000 
    })).toBe(false)
    at += 600
    expect(limiter.tryConsume({
      key: 'k',
      window_ms: 2_000 
    })).toBe(true)
  })

  it('keeps separate windows per key', () => {
    expect(limiter.tryConsume({
      key: 'p1:chat:global',
      window_ms: 2_000 
    })).toBe(true)
    expect(limiter.tryConsume({
      key: 'p1:chat:faction',
      window_ms: 2_000 
    })).toBe(true)
    expect(limiter.tryConsume({
      key: 'p2:chat:global',
      window_ms: 2_000 
    })).toBe(true)
    expect(limiter.tryConsume({
      key: 'p1:chat:global',
      window_ms: 2_000 
    })).toBe(false)
  })

  it('allows up to max hits per window', () => {
    expect(limiter.tryConsume({
      key: 'k',
      window_ms: 1_000,
      max: 2 
    })).toBe(true)
    expect(limiter.tryConsume({
      key: 'k',
      window_ms: 1_000,
      max: 2 
    })).toBe(true)
    expect(limiter.tryConsume({
      key: 'k',
      window_ms: 1_000,
      max: 2 
    })).toBe(false)
  })
})

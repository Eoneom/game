import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MovementAction } from '@eoneom/api-client'

import { formatSentAgo, pushRecentTarget, readRecentTargets } from '#movement/send/recent-targets'

describe('recent targets (slice 045)', () => {
  let store: Record<string, string>

  beforeEach(() => {
    store = {}
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps the 8 newest destinations, newest first, once per cell, per player', () => {
    for (let index = 1; index <= 9; index++) {
      pushRecentTarget('p1', { coordinates: { x: index, y: 1 }, action: MovementAction.ATTACK, sent_at: index })
    }
    pushRecentTarget('p1', { coordinates: { x: 5, y: 1 }, action: MovementAction.SPY, sent_at: 10 })

    const targets = readRecentTargets('p1')
    expect(targets).toHaveLength(8)
    expect(targets[0]).toEqual({ coordinates: { x: 5, y: 1 }, action: MovementAction.SPY, sent_at: 10 })
    expect(targets.filter(target => target.coordinates.x === 5)).toHaveLength(1)
    expect(readRecentTargets('p2')).toEqual([])
  })

  it('survives a throwing or corrupted localStorage', () => {
    store['eoneom:movement:recent-targets:p1'] = '{not json'
    expect(readRecentTargets('p1')).toEqual([])

    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') },
    })
    expect(readRecentTargets('p1')).toEqual([])
    expect(() => pushRecentTarget('p1', { coordinates: { x: 1, y: 1 }, action: MovementAction.EXPLORE, sent_at: 1 })).not.toThrow()
  })

  it('says how long ago', () => {
    expect(formatSentAgo(0, 30_000)).toBe('à l\'instant')
    expect(formatSentAgo(0, 5 * 60_000)).toBe('il y a 5 min')
    expect(formatSentAgo(0, 2 * 3_600_000)).toBe('il y a 2 h')
    expect(formatSentAgo(0, 3 * 86_400_000)).toBe('il y a 3 j')
  })
})

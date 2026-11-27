import { afterEach, describe, expect, it, vi } from 'vitest'

import { pickRestoredLocation, readStoredLocation, writeStoredLocation } from '#location/storage'

describe('pickRestoredLocation', () => {
  it('restores the stored city when the player still owns it', () => {
    expect(pickRestoredLocation({
      stored: { kind: 'city', id: 'c2' },
      cityIds: ['c1', 'c2'],
      outpostIds: [],
    })).toEqual({ kind: 'city', id: 'c2' })
  })

  it('restores the stored outpost when the player still owns it', () => {
    expect(pickRestoredLocation({
      stored: { kind: 'outpost', id: 'o1' },
      cityIds: ['c1'],
      outpostIds: ['o1'],
    })).toEqual({ kind: 'outpost', id: 'o1' })
  })

  it('falls back to the first city when the stored location is gone', () => {
    expect(pickRestoredLocation({
      stored: { kind: 'city', id: 'lost' },
      cityIds: ['c1', 'c2'],
      outpostIds: [],
    })).toEqual({ kind: 'city', id: 'c1' })
    expect(pickRestoredLocation({
      stored: { kind: 'outpost', id: 'lost' },
      cityIds: ['c1'],
      outpostIds: ['o1'],
    })).toEqual({ kind: 'city', id: 'c1' })
  })

  it('falls back to the first city when nothing is stored, and to nothing without cities', () => {
    expect(pickRestoredLocation({ stored: null, cityIds: ['c1'], outpostIds: null })).toEqual({ kind: 'city', id: 'c1' })
    expect(pickRestoredLocation({ stored: null, cityIds: [], outpostIds: null })).toBeNull()
  })
})

describe('stored location', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('round-trips through localStorage and ignores malformed values', () => {
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value) },
    })

    writeStoredLocation({ kind: 'outpost', id: 'o1' })
    expect(readStoredLocation()).toEqual({ kind: 'outpost', id: 'o1' })

    values.set('last-location', '{"kind":"planet","id":"x"}')
    expect(readStoredLocation()).toBeNull()
    values.set('last-location', 'not json')
    expect(readStoredLocation()).toBeNull()
  })

  it('does nothing when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(() => writeStoredLocation({ kind: 'city', id: 'c1' })).not.toThrow()
    expect(readStoredLocation()).toBeNull()
  })
})

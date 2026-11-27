const STORAGE_KEY = 'last-location'

export interface StoredLocation {
  kind: 'city' | 'outpost'
  id: string
}

/** `localStorage` may be missing (tests, private mode) or throw: the location is then simply not remembered. */
const getStorage = (): Storage | null => {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null
  } catch {
    return null
  }
}

export const readStoredLocation = (): StoredLocation | null => {
  try {
    const raw = getStorage()?.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredLocation>
    if ((parsed.kind !== 'city' && parsed.kind !== 'outpost') || typeof parsed.id !== 'string' || !parsed.id) {
      return null
    }
    return { kind: parsed.kind, id: parsed.id }
  } catch {
    return null
  }
}

export const writeStoredLocation = (location: StoredLocation): void => {
  try {
    getStorage()?.setItem(STORAGE_KEY, JSON.stringify(location))
  } catch {
    // Not remembered: empire pages fall back to the first city after a reload.
  }
}

/**
 * Location to restore on a page that carries no city or outpost in its URL (empire pages after a reload):
 * the stored one when the player still owns it, otherwise the first city.
 */
export const pickRestoredLocation = ({
  stored,
  cityIds,
  outpostIds,
}: {
  stored: StoredLocation | null
  cityIds: string[]
  outpostIds: string[] | null
}): StoredLocation | null => {
  if (stored?.kind === 'city' && cityIds.includes(stored.id)) {
    return stored
  }
  if (stored?.kind === 'outpost' && outpostIds?.includes(stored.id)) {
    return stored
  }
  const firstCity = cityIds[0]
  return firstCity ? { kind: 'city', id: firstCity } : null
}

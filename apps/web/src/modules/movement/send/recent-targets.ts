import { Coordinates } from '@eoneom/api-client'

import { SENDABLE_ACTIONS, SendableAction } from '#movement/send/search'

/** Last destinations the player sent troops to from this browser (slice 045), newest first. */
export interface RecentTarget {
  coordinates: Coordinates
  action: SendableAction
  sent_at: number
}

const RECENT_TARGETS_LIMIT = 8

const storageKey = (player_id: string): string => `eoneom:movement:recent-targets:${player_id}`

const isRecentTarget = (value: unknown): value is RecentTarget => {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<RecentTarget>
  return Number.isInteger(entry.coordinates?.x)
    && Number.isInteger(entry.coordinates?.y)
    && (SENDABLE_ACTIONS as readonly unknown[]).includes(entry.action)
    && typeof entry.sent_at === 'number'
}

/** Empty when storage is unavailable or holds something else. */
export const readRecentTargets = (player_id: string): RecentTarget[] => {
  try {
    const raw = window.localStorage.getItem(storageKey(player_id))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isRecentTarget).slice(0, RECENT_TARGETS_LIMIT) : []
  } catch {
    return []
  }
}

/** Puts the target first (once per cell) and keeps the 8 newest; storage failures are ignored. */
export const pushRecentTarget = (player_id: string, target: RecentTarget): void => {
  const next = [
    target,
    ...readRecentTargets(player_id).filter(entry =>
      entry.coordinates.x !== target.coordinates.x || entry.coordinates.y !== target.coordinates.y
    ),
  ].slice(0, RECENT_TARGETS_LIMIT)
  try {
    window.localStorage.setItem(storageKey(player_id), JSON.stringify(next))
  } catch {
    // Private mode or blocked storage: the list just stays empty.
  }
}

/** « il y a 2 h », « il y a 5 min », « à l'instant », « il y a 3 j ». */
export const formatSentAgo = (sent_at: number, now: number): string => {
  const seconds = Math.max(0, Math.floor((now - sent_at) / 1000))
  if (seconds < 60) return 'à l\'instant'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  return `il y a ${Math.floor(hours / 24)} j`
}

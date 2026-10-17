import type { SystemPlayerObservabilityEvent } from './types'

const MAX_LIVE_EVENTS = 200

let events: SystemPlayerObservabilityEvent[] = []
const listeners = new Set<() => void>()

export function pushSystemPlayerObservabilityEvent(event: SystemPlayerObservabilityEvent): void {
  events = [
    event,
    ...events,
  ].slice(0, MAX_LIVE_EVENTS)
  listeners.forEach(listener => listener())
}

export function getSystemPlayerObservabilityEvents(): SystemPlayerObservabilityEvent[] {
  return events
}

export function clearSystemPlayerObservabilityEvents(): void {
  events = []
  listeners.forEach(listener => listener())
}

export function subscribeSystemPlayerObservabilityEvents(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

import type { AdminSystemPlayerStatsSnapshot } from '@eoneom/api-client'

type Listener = () => void

let snapshots_by_player_id = new Map<string, AdminSystemPlayerStatsSnapshot>()
let cached_snapshots: AdminSystemPlayerStatsSnapshot[] = []
const listeners = new Set<Listener>()

function rebuildCachedSnapshots(): void {
  cached_snapshots = [ ...snapshots_by_player_id.values() ].sort((a, b) =>
    a.player_name.localeCompare(b.player_name)
  )
}

function notify(): void {
  for (const listener of listeners) {
    listener()
  }
}

function normalizeStatsSnapshot(snapshot: AdminSystemPlayerStatsSnapshot): AdminSystemPlayerStatsSnapshot {
  return {
    ...snapshot,
    ongoing_movements: snapshot.ongoing_movements ?? [],
  }
}

export function replaceSystemPlayerStatsSnapshots(players: AdminSystemPlayerStatsSnapshot[]): void {
  snapshots_by_player_id = new Map(
    players.map(snapshot => [ snapshot.player_id, normalizeStatsSnapshot(snapshot) ])
  )
  rebuildCachedSnapshots()
  notify()
}

export function patchSystemPlayerStatsSnapshot(snapshot: AdminSystemPlayerStatsSnapshot): void {
  const previous = snapshots_by_player_id.get(snapshot.player_id)
  snapshots_by_player_id.set(
    snapshot.player_id,
    normalizeStatsSnapshot({
      ...previous,
      ...snapshot,
      ongoing_movements: snapshot.ongoing_movements ?? previous?.ongoing_movements,
    } as AdminSystemPlayerStatsSnapshot),
  )
  rebuildCachedSnapshots()
  notify()
}

export function getSystemPlayerStatsSnapshots(): AdminSystemPlayerStatsSnapshot[] {
  return cached_snapshots
}

export function subscribeSystemPlayerStatsSnapshots(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function clearSystemPlayerStatsSnapshots(): void {
  snapshots_by_player_id = new Map()
  rebuildCachedSnapshots()
  notify()
}

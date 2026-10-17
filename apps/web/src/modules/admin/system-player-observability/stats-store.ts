import type { AdminSystemPlayerStatsSnapshot } from '@eoneom/api-client'

type Listener = () => void

let snapshots_by_player_id = new Map<string, AdminSystemPlayerStatsSnapshot>()
const listeners = new Set<Listener>()

function notify(): void {
  for (const listener of listeners) {
    listener()
  }
}

export function replaceSystemPlayerStatsSnapshots(players: AdminSystemPlayerStatsSnapshot[]): void {
  snapshots_by_player_id = new Map(players.map(snapshot => [ snapshot.player_id, snapshot ]))
  notify()
}

export function patchSystemPlayerStatsSnapshot(snapshot: AdminSystemPlayerStatsSnapshot): void {
  snapshots_by_player_id.set(snapshot.player_id, snapshot)
  notify()
}

export function getSystemPlayerStatsSnapshots(): AdminSystemPlayerStatsSnapshot[] {
  return [ ...snapshots_by_player_id.values() ].sort((a, b) => a.player_name.localeCompare(b.player_name))
}

export function subscribeSystemPlayerStatsSnapshots(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function clearSystemPlayerStatsSnapshots(): void {
  snapshots_by_player_id = new Map()
  notify()
}

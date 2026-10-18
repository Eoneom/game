import type { SystemTickCategory } from '#core/player/system/tick-category'

/** Read-only empire view for one system-player tick (no writes). */
export type SystemEmpireSnapshot = {
  player_id: string
  temporary_outpost_count: number
  expansion_categories: readonly SystemTickCategory[]
  economy_first: boolean
  production_ready_for_research: boolean
  defer_explore: boolean
  combat_army_ready: boolean
}

import { SYSTEM_EXPANSION_STARVED_PERMANENT_OUTPOST_TARGET } from '#core/player/system/constants'
import type { SystemTickCategory } from '#core/player/system/tick-category'

/** Read-only empire view for one system-player tick (no writes). */
export type SystemEmpireSnapshot = {
  player_id: string
  temporary_outpost_count: number
  permanent_outpost_count: number
  expansion_categories: readonly SystemTickCategory[]
  economy_first: boolean
  production_ready_for_research: boolean
  defer_explore: boolean
  /** True when the empire should prioritize creating temp outposts over economy-first ticks. */
  expansion_starved: boolean
  combat_army_ready: boolean
  /** Permanent outposts lack on-site gatherers and/or haulers for logistics. */
  needs_outpost_logistics: boolean
  /** Permanent outposts at system transport pressure (eligible for haul if a carrier is on site). */
  outpost_transport_pressure_count: number
}

export function isExpansionStarved({
  temporary_outpost_count,
  permanent_outpost_count,
  defer_explore,
}: Pick<
  SystemEmpireSnapshot,
  'temporary_outpost_count' | 'permanent_outpost_count' | 'defer_explore'
>): boolean {
  if (defer_explore) {
    return true
  }
  return temporary_outpost_count === 0
    && permanent_outpost_count < SYSTEM_EXPANSION_STARVED_PERMANENT_OUTPOST_TARGET
}

import { SYSTEM_EXPANSION_STARVED_PERMANENT_OUTPOST_TARGET } from '#core/player/system/constants'
import type { SystemEmpireIntel } from '#core/player/system/intel'
import { EMPTY_SYSTEM_EMPIRE_INTEL } from '#core/player/system/intel'
import type { SystemPlayerMemory } from '#core/player/system/memory'
import { EMPTY_SYSTEM_PLAYER_MEMORY } from '#core/player/system/memory'
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
  /** Player may found another city (`cities.length < count_limit`). */
  can_found_city: boolean
  /** Temporary outposts with a founder on site (eligible for `settle`). */
  settle_ready_temp_count: number
  /** No more outposts can be created (`base` would fail on temp creation). */
  outpost_limit_reached: boolean
  /** Ranked expansion commit candidates (base / settle / make-permanent). */
  frontier_queue_length: number
  frontier_top_score: number | null
  /** Opponent visibility and threat summary for combat / defend heuristics. */
  intel: SystemEmpireIntel
  empire_under_threat: boolean
  visible_enemy_combat_stacks: number
  /** Outposts missing gatherers (FSM `needs_gatherer` phase). */
  outpost_logistics_needs_gatherer_count: number
  /** Outposts with gatherers but needing haulers (`needs_haul` phase). */
  outpost_logistics_needs_haul_count: number
  /** Cross-tick memory loaded for action handlers (failed bases / attacks). */
  memory: SystemPlayerMemory
}

export function defaultSystemEmpireSnapshotFields(): Pick<
  SystemEmpireSnapshot,
  | 'frontier_queue_length'
  | 'frontier_top_score'
  | 'intel'
  | 'empire_under_threat'
  | 'visible_enemy_combat_stacks'
  | 'outpost_logistics_needs_gatherer_count'
  | 'outpost_logistics_needs_haul_count'
  | 'memory'
  | 'outpost_limit_reached'
> {
  return {
    frontier_queue_length: 0,
    frontier_top_score: null,
    intel: EMPTY_SYSTEM_EMPIRE_INTEL,
    empire_under_threat: false,
    visible_enemy_combat_stacks: 0,
    outpost_logistics_needs_gatherer_count: 0,
    outpost_logistics_needs_haul_count: 0,
    memory: EMPTY_SYSTEM_PLAYER_MEMORY,
    outpost_limit_reached: false,
  }
}

export function isExpansionStarved({
  temporary_outpost_count,
  permanent_outpost_count,
  defer_explore,
  outpost_limit_reached,
}: Pick<
  SystemEmpireSnapshot,
  | 'temporary_outpost_count'
  | 'permanent_outpost_count'
  | 'defer_explore'
  | 'outpost_limit_reached'
>): boolean {
  if (outpost_limit_reached) {
    return false
  }
  if (defer_explore) {
    return true
  }
  return temporary_outpost_count === 0
    && permanent_outpost_count < SYSTEM_EXPANSION_STARVED_PERMANENT_OUTPOST_TARGET
}

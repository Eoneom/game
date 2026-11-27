import { BuildingCode } from '#core/building/constant/code'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { DefenseCode } from '#core/defense/constant/code'
import { FactionCode } from '#core/faction/constant/code'
import { OutpostType } from '#core/outpost/constant/type'
import { TechnologyCode } from '#core/technology/constant/code'
import { TroopCode } from '#core/troop/constant/code'
import { Coordinates } from '#core/world/value/coordinates'
import { Resource } from '#shared/resource'

/** Spied location. `kind` and owner fields are `null` when the target vanished before arrival. */
export type SpyTarget = {
  kind: BattleTargetKind | null
  id: string | null
  /** City name; outposts and field stacks have none. */
  name: string | null
  owner_name: string | null
  faction_code: FactionCode | null
  coordinates: Coordinates
}

/** Intel snapshot taken at arrival; each field is present only when the tier and target kind reveal it. */
export type SpyIntel = {
  troops?: { code: TroopCode; count: number }[]
  defenses?: { code: DefenseCode; count: number }[]
  default_strategy?: CombatStrategy
  resources?: Resource
  buildings?: { code: BuildingCode; level: number }[]
  technologies?: { code: TechnologyCode; level: number }[]
  outpost_type?: OutpostType
}

/** `spy` report metadata (spy owner). */
export type ReportSpyMetadata = SpyIntel & {
  success: boolean
  /** The mission ended without a roll: the target vanished or changed to a same-faction owner. */
  aborted: boolean
  roll: number | null
  p_success: number | null
  /** `max(1, gap)` on success, 0 otherwise. */
  tier: number
  target: SpyTarget
  scouts_lost: number
}

/** `spy_detected` report metadata (target owner). */
export type ReportSpyDetectedMetadata = {
  spy_owner: {
    name: string
    faction_code: FactionCode
  }
  target: SpyTarget
  scouts_destroyed: number
}

/** Strength estimate of a spied location (slice 044). */
export type SpyStrengthEstimate = {
  attack: number
  life: number
  troop_count: number
  defenses_known: boolean
}

/** Which intel fields a spy report reveals. */
export type SpyIntelScope = Record<keyof SpyIntel, boolean>

/** Incoming attack before detection filtering. */
export type IncomingAttack = {
  id: string
  target: {
    kind: BattleTargetKind
    id: string | null
    name: string | null
    coordinates: Coordinates
  }
  arrive_at: number
  /** Attacker's departure cell and time (slice 044). */
  origin: Coordinates
  departure_at: number
  attacker: {
    name: string
    faction_code: FactionCode
  }
  troops: { code: TroopCode; count: number }[]
}

/** Incoming attack as the defender sees it at its live `detection` level. */
export type IncomingAttackView = {
  id: string
  target: IncomingAttack['target']
  arrive_at: number
  origin?: Coordinates
  departure_at?: number
  attacker?: IncomingAttack['attacker']
  unit_count?: number
  troops?: IncomingAttack['troops']
}

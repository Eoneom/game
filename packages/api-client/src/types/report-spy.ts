import { BuildingCode } from '@server-core/building/constant/code'
import { CombatStrategy } from '@server-core/combat/value/combat-strategy'
import { DefenseCode } from '@server-core/defense/constant/code'
import { FactionCode } from '@server-core/faction/constant/code'
import { OutpostType } from '@server-core/outpost/constant/type'
import { TechnologyCode } from '@server-core/technology/constant/code'
import { TroopCode } from '@server-core/troop/constant/code'
import { Coordinates } from '../endpoints/shared/coordinates'
import { Resource } from '../endpoints/shared/resource'

/** Spied location (slice 030); `kind` and owner fields are null when the target vanished before arrival. */
export type ReportSpyTarget = {
  kind: 'field' | 'city' | 'outpost' | null
  id: string | null
  /** City name; outposts and field stacks have none. */
  name: string | null
  owner_name: string | null
  faction_code: FactionCode | null
  coordinates: Coordinates
}

/** `spy` report (spy owner). Intel fields are present only when the tier and target kind reveal them. */
export type ReportSpyMetadata = {
  success: boolean
  /** No roll: the target vanished or changed to a same-faction owner; the scouts came back. */
  aborted: boolean
  roll: number | null
  p_success: number | null
  /** `max(1, espionage − target detection)` on success, 0 otherwise. */
  tier: number
  target: ReportSpyTarget
  scouts_lost: number
  troops?: { code: TroopCode; count: number }[]
  defenses?: { code: DefenseCode; count: number }[]
  default_strategy?: CombatStrategy
  resources?: Resource
  buildings?: { code: BuildingCode; level: number }[]
  technologies?: { code: TechnologyCode; level: number }[]
  outpost_type?: OutpostType
}

/** `spy_detected` report (target owner). */
export type ReportSpyDetectedMetadata = {
  spy_owner: {
    name: string
    faction_code: FactionCode
  }
  target: ReportSpyTarget
  scouts_destroyed: number
}

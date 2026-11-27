import { FactionCode } from '#core/faction/constant/code'
import { CITY_SIZE_LEVEL_THRESHOLDS } from '#core/world/constant/marker'

/** Settlement owner seen from the viewer (slice 044), first match wins in this order. */
export type MarkerRelation = 'mine' | 'ally' | 'system' | 'faction' | 'enemy'

export type CitySize = 1 | 2 | 3 | 4

interface MarkerParty {
  player_id: string
  faction_code: FactionCode
  alliance_id: string | null
}

export class WorldMarkerService {
  /** `mine` > `ally` (same alliance) > `system` (system-controlled owner) > `faction` (same faction) > `enemy`. */
  static getRelation({
    viewer,
    owner,
  }: {
    viewer: MarkerParty
    owner: MarkerParty & { system_controlled: boolean }
  }): MarkerRelation {
    if (owner.player_id === viewer.player_id) {
      return 'mine'
    }
    if (viewer.alliance_id !== null && owner.alliance_id === viewer.alliance_id) {
      return 'ally'
    }
    if (owner.system_controlled) {
      return 'system'
    }
    if (owner.faction_code === viewer.faction_code) {
      return 'faction'
    }
    return 'enemy'
  }

  /** Bucket of a city's total building levels (all buildings, Enceinte included). */
  static getCitySize(total_levels: number): CitySize {
    const index = CITY_SIZE_LEVEL_THRESHOLDS.findIndex(threshold => total_levels < threshold)
    return (index === -1 ? CITY_SIZE_LEVEL_THRESHOLDS.length + 1 : index + 1) as CitySize
  }
}

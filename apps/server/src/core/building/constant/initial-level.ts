import { BuildingCode } from '#core/building/constant/code'

/** Built at level 1 on every new city (`BuildingService.init`). */
export const BOOTSTRAP_LEVEL_ONE_BUILDING_CODES: ReadonlySet<BuildingCode> = new Set([
  BuildingCode.MUSHROOM_FARM,
  BuildingCode.RECYCLING_PLANT,
  BuildingCode.SOLAR_PANEL,
])

export function getBuildingInitialLevel(code: BuildingCode): number {
  return BOOTSTRAP_LEVEL_ONE_BUILDING_CODES.has(code) ? 1 : 0
}

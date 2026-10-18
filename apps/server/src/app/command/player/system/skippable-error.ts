import { BuildingError } from '#core/building/error'
import { CityError } from '#core/city/error'
import { RequirementError } from '#core/requirement/error'
import { TechnologyError } from '#core/technology/error'
import { TroopError } from '#core/troop/error'

const SKIPPABLE_ERROR_CODES = new Set<string>([
  CityError.NOT_ENOUGH_RESOURCES,
  CityError.NOT_ENOUGH_SPACE,
  TroopError.NOT_ENOUGH_TROOPS,
  BuildingError.ALREADY_IN_PROGRESS,
  BuildingError.QUEUE_FULL,
  TechnologyError.QUEUE_FULL,
  RequirementError.BUILDING_NOT_FULFILLED,
  RequirementError.TECHNOLOGY_NOT_FULFILLED,
])

export function isSystemTickSkippableError(err: unknown): boolean {
  if (!(err instanceof Error)) {
    return false
  }
  return SKIPPABLE_ERROR_CODES.has(err.message)
}

import { BuildingCode } from '#core/building/constant/code'
import { TechnologyCode } from '#core/technology/constant/code'
import { Resource } from '#shared/resource'

export interface LevelCost {
  base: number
  multiplier: number
}

export interface LevelCosts {
  plastic: LevelCost
  mushroom: LevelCost
  duration: LevelCost
  /** Absent means no plasma cost at any level. */
  plasma?: LevelCost
}

export interface LevelCostValue {
  code: BuildingCode | TechnologyCode
  level: number
  resource: Resource
  duration: number
}

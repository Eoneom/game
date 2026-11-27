import { BuildingCode } from '#core/building/constant/code'
import { DefenseCode } from '#core/defense/constant/code'
import { PricingService } from '#core/pricing/service'
import {
  RANKING_PLASMA_WEIGHT,
  RANKING_POINTS_DIVISOR
} from '#core/ranking/constant/limits'
import {
  RankingPlayerAssets,
  RankingScores
} from '#core/ranking/type'
import { RankingCategory } from '#core/ranking/value/category'
import { TechnologyCode } from '#core/technology/constant/code'
import { TroopCode } from '#core/troop/constant/code'
import { Resource } from '#shared/resource'

/**
 * Value invested in what a player owns (slice 034). Only resource costs count: the reductions passed to
 * `PricingService` (Architecture, research lab, cloning factory, Enceinte) only shorten durations, and they are
 * set to 0 here so no level-based reduction can leak into a value.
 */
export class RankingService {
  /** `plastic + mushroom + 5 × plasma`. */
  static resourceValue(resource: Resource): number {
    return resource.plastic + resource.mushroom + RANKING_PLASMA_WEIGHT * resource.plasma
  }

  /** `floor(value / 1000)`. */
  static points(value: number): number {
    return Math.floor(Math.max(0, value) / RANKING_POINTS_DIVISOR)
  }

  /** Σ cost of levels 1..L, free starting levels and the Enceinte included. */
  static buildingValue({
    code,
    level,
  }: {
    code: BuildingCode
    level: number
  }): number {
    let value = 0
    for (let current = 1; current <= level; current++) {
      value += this.resourceValue(PricingService.getBuildingLevelCost({
        code,
        level: current,
        architecture_level: 0,
      }).resource)
    }
    return value
  }

  /** Σ cost of levels 1..L. */
  static technologyValue({
    code,
    level,
  }: {
    code: TechnologyCode
    level: number
  }): number {
    let value = 0
    for (let current = 1; current <= level; current++) {
      value += this.resourceValue(PricingService.getTechnologyLevelCost({
        code,
        level: current,
        research_lab_level: 0,
      }).resource)
    }
    return value
  }

  /** `count × unit cost`. */
  static troopValue({
    code,
    count,
  }: {
    code: TroopCode
    count: number
  }): number {
    if (count <= 0) {
      return 0
    }
    return this.resourceValue(PricingService.getTroopCost({
      code,
      count,
      cloning_factory_level: 0,
      replication_catalyst_level: 0,
    }).resource)
  }

  /** `count × unit cost`. */
  static defenseValue({
    code,
    count,
  }: {
    code: DefenseCode
    count: number
  }): number {
    if (count <= 0) {
      return 0
    }
    return this.resourceValue(PricingService.getDefenseCost({
      code,
      count,
      city_wall_level: 0,
    }).resource)
  }

  /** Points per category: global = buildings + technologies + troops + defenses; economy = buildings + technologies. */
  static scores(assets: RankingPlayerAssets): RankingScores {
    const buildings = assets.buildings.reduce((sum, building) => sum + this.buildingValue(building), 0)
    const technologies = assets.technologies.reduce((sum, technology) => sum + this.technologyValue(technology), 0)
    const troops = assets.troops.reduce((sum, troop) => sum + this.troopValue(troop), 0)
    const defenses = assets.defenses.reduce((sum, defense) => sum + this.defenseValue(defense), 0)
    const economy = buildings + technologies

    return {
      [RankingCategory.GLOBAL]: this.points(economy + troops + defenses),
      [RankingCategory.ECONOMY]: this.points(economy),
      [RankingCategory.MILITARY]: this.points(assets.military_value),
    }
  }
}

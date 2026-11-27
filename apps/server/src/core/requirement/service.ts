import { BuildingCode } from '#core/building/constant/code'
import { BuildingRequirement } from '#core/requirement/constant/building'
import { DefenseRequirement } from '#core/requirement/constant/defense'
import { DefenseCode } from '#core/defense/constant/code'
import { TechnologyRequirement } from '#core/requirement/constant/technology'
import { TroopRequirement } from '#core/requirement/constant/troop'
import { RequirementError } from '#core/requirement/error'
import { RequirementValue } from '#core/requirement/value/requirement'
import { TechnologyCode } from '#core/technology/constant/code'
import { TroopCode } from '#core/troop/constant/code'

export interface Levels {
  building: Partial<Record<BuildingCode, number>>
  technology: Partial<Record<TechnologyCode, number>>
}

export class RequirementService {
  static listTroopRequirements(): typeof TroopRequirement {
    return TroopRequirement
  }
  static getTroopRequirement({ troop_code }: { troop_code: TroopCode }): RequirementValue {
    return TroopRequirement[troop_code]
  }
  static checkTroopRequirement({
    troop_code,
    levels
  }: {
    troop_code: TroopCode,
    levels: Levels
  }): void {
    const requirement = this.getTroopRequirement({ troop_code })
    return this.checkRequirement({
      requirement,
      levels
    })
  }

  static getDefenseRequirement({ defense_code }: { defense_code: DefenseCode }): RequirementValue {
    return DefenseRequirement[defense_code]
  }
  static checkDefenseRequirement({
    defense_code,
    levels
  }: {
    defense_code: DefenseCode
    levels: Levels
  }): void {
    const requirement = this.getDefenseRequirement({ defense_code })
    return this.checkRequirement({
      requirement,
      levels
    })
  }

  static listBuildingRequirements(): typeof BuildingRequirement {
    return BuildingRequirement
  }
  static getBuildingRequirement({ building_code }: { building_code: BuildingCode }): RequirementValue {
    return BuildingRequirement[building_code]
  }
  static checkBuildingRequirement({
    building_code,
    levels
  }: {
    building_code: BuildingCode
    levels: Levels
  }): void {
    const requirement = this.getBuildingRequirement({ building_code })
    return this.checkRequirement({
      requirement,
      levels
    })
  }

  static getTechnologyRequirement({
    technology_code,
    technology_level
  }: {
    technology_code: TechnologyCode
    technology_level: number
  }): RequirementValue {
    return this.applyResearchLabRequirementOffset(
      TechnologyRequirement[technology_code],
      technology_level
    )
  }
  static listTechnologyRequirements(): typeof TechnologyRequirement {
    return TechnologyRequirement
  }
  static checkTechnologyRequirement({
    technology_code,
    technology_level,
    levels
  }: {
    technology_code: TechnologyCode
    technology_level: number
    levels: Levels
  }): void {
    const requirement = this.getTechnologyRequirement({
      technology_code,
      technology_level
    })
    return this.checkRequirement({
      requirement,
      levels
    })
  }

  private static applyResearchLabRequirementOffset(
    requirement: RequirementValue,
    technology_level: number
  ): RequirementValue {
    return {
      buildings: requirement.buildings.map((b) => b.code === BuildingCode.RESEARCH_LAB
        ? {
          ...b,
          level: b.level + technology_level 
        }
        : b),
      technologies: requirement.technologies
    }
  }

  private static checkRequirement({
    requirement,
    levels
  }: {
    requirement: RequirementValue,
    levels: Levels
   }): void {
    requirement.buildings.forEach((requirement) => {
      const level = levels.building[requirement.code]
      if (!level || level < requirement.level) {
        throw new Error(RequirementError.BUILDING_NOT_FULFILLED)
      }
    })

    requirement.technologies.forEach((requirement) => {
      const level = levels.technology[requirement.code]
      if (!level || level < requirement.level) {
        throw new Error(RequirementError.TECHNOLOGY_NOT_FULFILLED)
      }
    })
  }
}

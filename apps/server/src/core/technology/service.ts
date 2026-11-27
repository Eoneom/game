import { CombatModifiers } from '#core/combat/type/battle-stack'
import {
  BonusTechnologyCode,
  technology_bonus_per_level
} from '#core/technology/constant/bonus'
import { TechnologyCode } from '#core/technology/constant/code'
import { technology_order } from '#core/technology/constant/order'
import { TechnologyEntity } from '#core/technology/entity'
import { Resource } from '#shared/resource'

export class TechnologyService {
  static init({ player_id }: { player_id: string }): TechnologyEntity[] {
    const technologies = Object.values(TechnologyCode).map(code => TechnologyEntity.init({
      player_id,
      code
    }))

    return technologies
  }

  static sortTechnologies({ technologies }: {technologies: TechnologyEntity[]}): TechnologyEntity[] {
    return technologies.sort((a, b ) => technology_order[a.code] - technology_order[b.code])
  }

  static getBonusMultiplier({
    code,
    level
  }: {
    code: BonusTechnologyCode
    level: number
  }): number {
    return 1 + technology_bonus_per_level[code] * Math.max(0, level)
  }

  static getCombatModifiers({
    ballistic_alloys_level,
    organic_plating_level
  }: {
    ballistic_alloys_level: number
    organic_plating_level: number
  }): CombatModifiers {
    return {
      attack: this.getBonusMultiplier({
        code: TechnologyCode.BALLISTIC_ALLOYS,
        level: ballistic_alloys_level
      }),
      life: this.getBonusMultiplier({
        code: TechnologyCode.ORGANIC_PLATING,
        level: organic_plating_level
      })
    }
  }

  /** Attack and life multiplier of defenses (slice 029). */
  static getFortificationMultiplier({ fortification_level }: { fortification_level: number }): number {
    return this.getBonusMultiplier({
      code: TechnologyCode.FORTIFICATION,
      level: fortification_level
    })
  }

  static getProductionMultipliers({
    advanced_recycling_level,
    agronomy_level,
    plasma_containment_level
  }: {
    advanced_recycling_level: number
    agronomy_level: number
    plasma_containment_level: number
  }): Resource {
    return {
      plastic: this.getBonusMultiplier({
        code: TechnologyCode.ADVANCED_RECYCLING,
        level: advanced_recycling_level
      }),
      mushroom: this.getBonusMultiplier({
        code: TechnologyCode.AGRONOMY,
        level: agronomy_level
      }),
      plasma: this.getBonusMultiplier({
        code: TechnologyCode.PLASMA_CONTAINMENT,
        level: plasma_containment_level
      }),
      // No Économie technology boosts water (slice 035).
      water: 1
    }
  }
}

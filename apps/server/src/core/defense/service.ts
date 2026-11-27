import { DEFENSE_BUILD_QUEUE_LIMIT } from '#core/defense/constant/build-queue'
import { DEFENSE_CAPACITY_PER_CITY_WALL_LEVEL } from '#core/defense/constant/capacity'
import { defense_characteristics } from '#core/defense/constant/characteristic'
import { DefenseCode } from '#core/defense/constant/code'
import { defense_order } from '#core/defense/constant/order'
import { DefenseEntity } from '#core/defense/entity'
import { DefenseError } from '#core/defense/error'

type DefenseCount = {
  code: DefenseCode
  count: number
}

export class DefenseService {
  /** One row per defense type at count 0, created with every city. */
  static init({
    player_id,
    city_id
  }: {
    player_id: string
    city_id: string
  }): DefenseEntity[] {
    return Object.values(DefenseCode).map(code => DefenseEntity.init({
      player_id,
      city_id,
      code
    }))
  }

  /** Defense points granted by the city's Enceinte: `20 × level`. */
  static getCapacity({ city_wall_level }: { city_wall_level: number }): number {
    return Math.max(0, city_wall_level) * DEFENSE_CAPACITY_PER_CITY_WALL_LEVEL
  }

  static getPoints({
    code, count 
  }: DefenseCount): number {
    return defense_characteristics[code].points * Math.max(0, count)
  }

  static getTotalPoints(stacks: DefenseCount[]): number {
    return stacks.reduce((sum, stack) => sum + this.getPoints(stack), 0)
  }

  /**
   * Rejects a build when existing, queued and requested points exceed the city's capacity.
   * `queued_points` covers the active batch (remaining units) and every waiting row.
   */
  static assertCapacity({
    city_wall_level,
    used_points,
    queued_points,
    code,
    count
  }: {
    city_wall_level: number
    used_points: number
    queued_points: number
    code: DefenseCode
    count: number
  }): void {
    const requested_points = this.getPoints({
      code,
      count
    })
    if (used_points + queued_points + requested_points > this.getCapacity({ city_wall_level })) {
      throw new Error(DefenseError.CAPACITY_EXCEEDED)
    }
  }

  /** Waiting fortification slots in a city: none until its Enceinte is built. */
  static getBuildQueueLimit({ city_wall_level }: { city_wall_level: number }): number {
    return city_wall_level >= 1 ? DEFENSE_BUILD_QUEUE_LIMIT : 0
  }

  static isArmed(code: DefenseCode): boolean {
    return defense_characteristics[code].armed
  }

  static sortDefenses<T extends { code: DefenseCode }>({ defenses }: { defenses: T[] }): T[] {
    return [ ...defenses ].sort((a, b) => defense_order[a.code] - defense_order[b.code])
  }
}

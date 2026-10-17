import { getStrategyMultipliers } from '#core/combat/constant/strategy'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { CombatTroopClass } from '#core/combat/value/combat-troop-class'

export class CombatStrategyService {
  static getMultipliers({
    strategy,
    round,
    troop_class,
  }: {
    strategy: CombatStrategy
    round: number
    troop_class: CombatTroopClass
  }): { attack: number; life: number } {
    return getStrategyMultipliers({
      strategy,
      round,
      troop_class,
    })
  }
}

import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { CityError } from '#core/city/error'
import { CombatStrategy } from '#core/combat/value/combat-strategy'

export interface CitySetCombatStrategyParams {
  city_id: string
  player_id: string
  combat_strategy: CombatStrategy
}

export async function citySetCombatStrategy({
  city_id,
  player_id,
  combat_strategy,
}: CitySetCombatStrategyParams): Promise<void> {
  return runCommand('city:set-combat-strategy', async () => {
    const repository = Factory.getRepository()

    const city = await repository.city.get(city_id)
    if (!city.isOwnedBy(player_id)) {
      throw new Error(CityError.NOT_OWNER)
    }

    if (city.default_combat_strategy === combat_strategy) {
      return
    }

    await repository.city.updateOne(city.withDefaultCombatStrategy(combat_strategy))
  })
}

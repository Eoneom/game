import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { OutpostError } from '#core/outpost/error'

export interface OutpostSetCombatStrategyParams {
  outpost_id: string
  player_id: string
  combat_strategy: CombatStrategy
}

export async function outpostSetCombatStrategy({
  outpost_id,
  player_id,
  combat_strategy,
}: OutpostSetCombatStrategyParams): Promise<void> {
  return runCommand('outpost:set-combat-strategy', async () => {
    const repository = Factory.getRepository()

    const outpost = await repository.outpost.getById(outpost_id)
    if (!outpost.isOwnedBy(player_id)) {
      throw new Error(OutpostError.NOT_OWNER)
    }

    if (outpost.default_combat_strategy === combat_strategy) {
      return
    }

    await repository.outpost.updateOne(outpost.withDefaultCombatStrategy(combat_strategy))
  })
}

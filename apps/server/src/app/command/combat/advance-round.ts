import { Factory } from '#adapter/factory'
import { applyBattleOutcomes } from '#app/command/combat/apply-battle-outcomes'
import { runCommand } from '#command/run'
import { CombatService } from '#core/combat/combat-service'
import { COMBAT_ROUND_INTERVAL_MS } from '#app/scheduling/intervals'

export async function advanceCombatRound({
  battle_id,
  round,
  advanced_at,
}: {
  battle_id: string
  round: number
  advanced_at: number
}): Promise<void> {
  return runCommand('combat:advance-round', async () => {
    const repository = Factory.getRepository()
    const job_queue = Factory.getJobQueue()

    const battle = await repository.battle.getById(battle_id)
    if (battle.status === 'finished') {
      return
    }

    const {
      attacker_stacks,
      defender_stacks,
      round_summary,
      winner,
    } = CombatService.advanceRound({
      round,
      attacker_stacks: battle.state_json.attacker_stacks,
      defender_stacks: battle.state_json.defender_stacks,
      attacker_strategy: battle.attacker_strategy,
      defender_strategy: battle.defender_strategy,
    })

    const state_json = {
      ...battle.state_json,
      attacker_stacks,
      defender_stacks,
      round_summaries: [...battle.state_json.round_summaries, round_summary],
      cumulative_attacker_losses: CombatService.mergeCumulativeLosses(
        battle.state_json.cumulative_attacker_losses,
        round_summary.attacker_losses
      ),
      cumulative_defender_losses: CombatService.mergeCumulativeLosses(
        battle.state_json.cumulative_defender_losses,
        round_summary.defender_losses
      ),
    }

    let updated = battle.withRoundAdvance({
      current_round: round,
      state_json,
    })

    if (winner) {
      await repository.battle.update(updated)
      await applyBattleOutcomes({
        battle_id,
        winner,
        finished_at: advanced_at,
      })
      return
    }

    await repository.battle.update(updated)

    await job_queue.scheduleCombatRoundAdvance({
      battle_id,
      round: round + 1,
      execute_at: advanced_at + COMBAT_ROUND_INTERVAL_MS,
    })
  })
}

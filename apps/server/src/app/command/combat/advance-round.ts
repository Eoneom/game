import { Factory } from '#adapter/factory'
import {
  applyBattleOutcomes,
  ApplyBattleOutcomesResult,
} from '#app/command/combat/apply-battle-outcomes'
import { runCommand } from '#command/run'
import { CombatService } from '#core/combat/combat-service'
import { BattleWinner } from '#core/combat/value/battle-winner'
import { ReportPerspective } from '#core/combat/value/report-perspective'
import { COMBAT_ROUND_INTERVAL_MS } from '#app/scheduling/intervals'
import { AppEvent } from '#core/events'

export async function advanceCombatRound({
  battle_id,
  round,
  advanced_at,
}: {
  battle_id: string
  round: number
  advanced_at: number
}): Promise<void> {
  type FinishedBattle = ApplyBattleOutcomesResult & { winner: BattleWinner }
  let finished_battle: FinishedBattle | null = null

  await runCommand('combat:advance-round', async () => {
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
      attacker_modifiers: battle.state_json.attacker_modifiers,
      defender_modifiers: battle.state_json.defender_modifiers,
    })

    const state_json = {
      ...battle.state_json,
      attacker_stacks,
      defender_stacks,
      cumulative_attacker_losses: CombatService.mergeCumulativeLosses(
        battle.state_json.cumulative_attacker_losses,
        round_summary.attacker_losses
      ),
      cumulative_defender_losses: CombatService.mergeCumulativeLosses(
        battle.state_json.cumulative_defender_losses,
        round_summary.defender_losses
      ),
    }

    const updated = battle.withRoundAdvance({
      round_summary,
      state_json,
    })

    if (winner) {
      await repository.battle.update(updated)
      const result = await applyBattleOutcomes({
        battle_id,
        winner,
        finished_at: advanced_at,
      })
      finished_battle = { ...result, winner }
      return
    }

    await repository.battle.update(updated)

    await job_queue.scheduleCombatRoundAdvance({
      battle_id,
      round: round + 1,
      execute_at: advanced_at + COMBAT_ROUND_INTERVAL_MS,
    })
  })

  // Assigned inside the runCommand callback, so TS cannot see it change from null.
  const finished = finished_battle as FinishedBattle | null
  if (finished) {
    const event_bus = Factory.getEventBus()
    event_bus.emit(AppEvent.BattleFinished, {
      player_id: finished.attacker_player_id,
      report_id: finished.attacker_report_id,
      perspective: ReportPerspective.ATTACKER,
      winner: finished.winner,
    })
    event_bus.emit(AppEvent.BattleFinished, {
      player_id: finished.defender_player_id,
      report_id: finished.defender_report_id,
      perspective: ReportPerspective.DEFENDER,
      winner: finished.winner,
    })
  }
}

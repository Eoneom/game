import { Factory } from '#adapter/factory'
import {
  applyBattleOutcomes,
  ApplyBattleOutcomesResult,
} from '#app/command/combat/apply-battle-outcomes'
import { runCommand } from '#command/run'
import { CombatService } from '#core/combat/combat-service'
import {
  BattleStack,
  isDefenseStack
} from '#core/combat/type/battle-stack'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { DefenseCode } from '#core/defense/constant/code'
import { BattleWinner } from '#core/combat/value/battle-winner'
import { ReportPerspective } from '#core/combat/value/report-perspective'
import { COMBAT_ROUND_INTERVAL_MS } from '#app/scheduling/intervals'
import { AppEvent } from '#core/events'

function isFiringCandidateBattery(stack: BattleStack): boolean {
  return isDefenseStack(stack) && stack.code === DefenseCode.PLASMA_BATTERY && stack.count > 0
}

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

    // Plasma batteries fire from the city stock, debited during the round (slice 029).
    const has_batteries = battle.target_kind === BattleTargetKind.CITY
      && battle.state_json.defender_stacks.some(isFiringCandidateBattery)
    const city_stock = has_batteries
      ? await repository.resource_stock.getByCellId({ cell_id: battle.cell_id })
      : null

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
      defender_owner_modifiers: battle.state_json.defender_owner_modifiers,
      defender_plasma: city_stock ? city_stock.plasma : undefined,
    })

    const plasma_spent = round_summary.defender_plasma_spent ?? 0
    if (city_stock && plasma_spent > 0) {
      await repository.resource_stock.updateOne(city_stock.purchase({
        resource: {
          plastic: 0,
          mushroom: 0,
          plasma: plasma_spent,
        },
      }))
    }

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
    for (const reinforcement of finished.reinforcement_reports ?? []) {
      event_bus.emit(AppEvent.BattleFinished, {
        player_id: reinforcement.player_id,
        report_id: reinforcement.report_id,
        perspective: ReportPerspective.REINFORCEMENT,
        winner: finished.winner,
      })
    }
  }
}

import { Factory } from '#adapter/factory'
import { BattleOutcomeFlags } from '#app/command/combat/apply-battle-outcomes'
import { BattleEntity } from '#core/combat/entity/battle'
import { ReportPerspective } from '#core/combat/value/report-perspective'
import { ReportEntity } from '#core/communication/report/entity'
import { ReportType } from '#core/communication/value/report-type'
import { AppEvent } from '#core/events'
import { MovementEntity } from '#core/troop/movement/entity'
import { Resource } from '#shared/resource'
import { id } from '#shared/identification'

export async function createBattleReports({
  battle,
  movement,
  outcome,
  loot,
  finished_at,
}: {
  battle: BattleEntity
  movement: MovementEntity
  outcome: BattleOutcomeFlags
  loot: Resource
  finished_at: number
}): Promise<void> {
  const repository = Factory.getRepository()
  const event_bus = Factory.getEventBus()

  const attacker = await repository.player.get(battle.attacker_player_id)
  const defender = await repository.player.get(battle.defender_player_id)

  const rounds_played = battle.state_json.round_summaries.length

  const shared = {
    battle_id: battle.id,
    movement_id: battle.movement_id,
    attacker_player_id: battle.attacker_player_id,
    defender_player_id: battle.defender_player_id,
    attacker_faction_code: attacker.faction_code,
    defender_faction_code: defender.faction_code,
    target_kind: battle.target_kind,
    target_id: battle.target_id,
    winner: battle.winner!,
    attacker_strategy: battle.attacker_strategy,
    defender_strategy: battle.defender_strategy,
    rounds_played,
    outcome,
    casualties_attacker: battle.state_json.cumulative_attacker_losses,
    casualties_defender: battle.state_json.cumulative_defender_losses,
    round_summaries: battle.state_json.round_summaries,
  }

  const attacker_report = ReportEntity.create({
    id: id(),
    type: ReportType.BATTLE,
    was_read: false,
    player_id: battle.attacker_player_id,
    troops: battle.state_json.cumulative_attacker_losses,
    recorded_at: finished_at,
    origin: movement.origin,
    destination: movement.destination,
    resources: outcome.loot_applied ? loot : { plastic: 0, mushroom: 0, plasma: 0 },
    remaining_resources: { plastic: 0, mushroom: 0, plasma: 0 },
  })

  const defender_report = ReportEntity.create({
    id: id(),
    type: ReportType.BATTLE,
    was_read: false,
    player_id: battle.defender_player_id,
    troops: battle.state_json.cumulative_defender_losses,
    recorded_at: finished_at,
    origin: movement.origin,
    destination: movement.destination,
    resources: { plastic: 0, mushroom: 0, plasma: 0 },
    remaining_resources: { plastic: 0, mushroom: 0, plasma: 0 },
  })

  await repository.report.createBattleReports({
    attacker_report,
    defender_report,
    attacker_metadata: {
      ...shared,
      perspective: ReportPerspective.ATTACKER,
    },
    defender_metadata: {
      ...shared,
      perspective: ReportPerspective.DEFENDER,
    },
  })

  event_bus.emit(AppEvent.BattleFinished, { player_id: battle.attacker_player_id })
  event_bus.emit(AppEvent.BattleFinished, { player_id: battle.defender_player_id })
}

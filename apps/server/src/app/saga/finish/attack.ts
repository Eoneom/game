import { Factory } from '#adapter/factory'
import {
  resolveAttackTarget,
  stacksToBattleStacks,
} from '#app/command/troop/movement/attack-target'
import { BattleEntity } from '#core/combat/entity/battle'
import { BattleStateJson } from '#core/combat/type/battle-stack'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { TroopError } from '#core/troop/error'
import { id } from '#shared/identification'

export const sagaFinishAttack = async ({
  player_id,
  movement_id,
  arrived_at,
}: {
  player_id: string
  movement_id: string
  arrived_at: number
}): Promise<void> => {
  const repository = Factory.getRepository()
  const job_queue = Factory.getJobQueue()

  const movement = await repository.movement.getById(movement_id)
  if (!movement.isOwnedBy(player_id)) {
    throw new Error(TroopError.MOVEMENT_NOT_OWNER)
  }

  const attacker = await repository.player.get(player_id)
  const target = await resolveAttackTarget({
    attacker_player_id: player_id,
    attacker_faction_code: attacker.faction_code,
    destination: movement.destination,
  })

  const movement_troops = await repository.troop.listByMovement({ movement_id })
  const attacker_stacks = stacksToBattleStacks(movement_troops)

  const cell_troops = await repository.troop.listAllInCell({ cell_id: target.destination_cell_id })
  const defender_troops = cell_troops.filter(
    troop =>
      troop.player_id === target.defender_player_id
      && troop.count > 0
      && troop.movement_id === null
  )
  const defender_stacks = stacksToBattleStacks(defender_troops)

  let defender_strategy = CombatStrategy.BALANCED
  if (target.target_kind === BattleTargetKind.CITY && target.target_id) {
    const city = await repository.city.get(target.target_id)
    defender_strategy = city.default_combat_strategy ?? CombatStrategy.BALANCED
  } else if (target.target_kind === BattleTargetKind.OUTPOST && target.target_id) {
    const outpost = await repository.outpost.getById(target.target_id)
    defender_strategy = outpost.default_combat_strategy ?? CombatStrategy.BALANCED
  }

  const attacker_strategy = movement.combat_strategy ?? CombatStrategy.BALANCED

  const state_json: BattleStateJson = {
    attacker_stacks,
    defender_stacks,
    attacker_origin: movement.origin,
    round_summaries: [],
    cumulative_attacker_losses: [],
    cumulative_defender_losses: [],
  }

  const battle = BattleEntity.create({
    id: id(),
    movement_id,
    attacker_player_id: player_id,
    defender_player_id: target.defender_player_id,
    cell_id: target.destination_cell_id,
    target_kind: target.target_kind,
    target_id: target.target_id,
    attacker_strategy,
    defender_strategy,
    current_round: 0,
    status: 'in_progress',
    winner: null,
    state_json,
    started_at: arrived_at,
    finished_at: null,
  })

  await repository.battle.create(battle)

  await job_queue.scheduleCombatRoundAdvance({
    battle_id: battle.id,
    round: 1,
    execute_at: arrived_at,
  })
}

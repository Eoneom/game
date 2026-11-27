import { Factory } from '#adapter/factory'
import { AppService } from '#app/service'
import {
  resolveAttackTarget,
  stacksToBattleStacks,
} from '#app/command/troop/movement/attack-target'
import { BattleEntity } from '#core/combat/entity/battle'
import {
  BattleStack,
  BattleStateJson,
  CombatModifiers,
} from '#core/combat/type/battle-stack'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import {
  CombatStrategy,
  resolveDefaultCombatStrategy,
} from '#core/combat/value/combat-strategy'
import { FactionService } from '#core/faction/service'
import { TroopEntity } from '#core/troop/entity'
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
  const defender_stacks: BattleStack[] = stacksToBattleStacks(defender_troops)

  let defender_strategy = CombatStrategy.BALANCED
  let defender_owner_modifiers: Record<string, CombatModifiers> | undefined = undefined
  let garrison = 1
  if (target.target_kind === BattleTargetKind.CITY && target.target_id) {
    const city = await repository.city.get(target.target_id)
    // The host's garrison default applies to every defender stack, reinforcements included (slice 033).
    defender_strategy = resolveDefaultCombatStrategy(city.default_combat_strategy)
    const reinforcements = await snapshotReinforcements({
      cell_troops,
      host_player_id: target.defender_player_id,
      attacker_player_id: player_id,
    })
    defender_stacks.push(...reinforcements.stacks)
    defender_owner_modifiers = reinforcements.owner_modifiers
    // Garrison (slice 037): the owner's own combat stacks in their own city; reinforcements never get it.
    garrison = FactionService.getGarrisonLifeMultiplier(target.defender_faction_code)
    // City defenses join the defender side (slice 029).
    const defenses = await repository.defense.listByCity({ city_id: city.id })
    defender_stacks.push(...defenses
      .filter(defense => defense.count > 0)
      .map(defense => ({
        kind: 'defense' as const,
        code: defense.code,
        count: defense.count,
      })))
  } else if (target.target_kind === BattleTargetKind.OUTPOST && target.target_id) {
    const outpost = await repository.outpost.getById(target.target_id)
    defender_strategy = resolveDefaultCombatStrategy(outpost.default_combat_strategy)
  }

  const attacker_strategy = movement.combat_strategy ?? CombatStrategy.BALANCED

  const [
    attacker_modifiers,
    defender_combat_modifiers,
    defender_fortification,
  ] = await Promise.all([
    AppService.getCombatModifiers({ player_id }),
    AppService.getCombatModifiers({ player_id: target.defender_player_id }),
    AppService.getFortificationMultiplier({ player_id: target.defender_player_id }),
  ])
  const defender_modifiers: CombatModifiers = {
    ...defender_combat_modifiers,
    fortification: defender_fortification,
    ...(garrison !== 1 ? { garrison } : {}),
  }

  const state_json: BattleStateJson = {
    attacker_stacks,
    defender_stacks,
    attacker_origin: movement.origin,
    cumulative_attacker_losses: [],
    cumulative_defender_losses: [],
    attacker_modifiers,
    defender_modifiers,
    ...(defender_owner_modifiers ? { defender_owner_modifiers } : {}),
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
    round_summaries: [],
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

/**
 * Reinforcement stacks on the attacked city cell (slice 033): stationed troops of the host's current
 * alliance members, one stack per owner and code, carrying the owner's `player_id`, with each owner's
 * Arsenal modifiers. `undefined` modifiers when the city holds no reinforcement (unchanged snapshot).
 */
async function snapshotReinforcements({
  cell_troops,
  host_player_id,
  attacker_player_id,
}: {
  cell_troops: TroopEntity[]
  host_player_id: string
  attacker_player_id: string
}): Promise<{ stacks: BattleStack[]; owner_modifiers: Record<string, CombatModifiers> | undefined }> {
  const isForeignStationed = (troop: TroopEntity): boolean => troop.player_id !== host_player_id
    && troop.player_id !== attacker_player_id
    && troop.count > 0
    && troop.movement_id === null
  const foreign = cell_troops.filter(isForeignStationed)
  if (foreign.length === 0) {
    return {
      stacks: [],
      owner_modifiers: undefined,
    }
  }

  const repository = Factory.getRepository()
  const host_membership = await repository.alliance.findMembership(host_player_id)
  if (!host_membership) {
    return {
      stacks: [],
      owner_modifiers: undefined,
    }
  }
  const member_ids = new Set((await repository.alliance.listMembers(host_membership.alliance_id)).map(member => member.player_id))
  const allied = foreign.filter(troop => member_ids.has(troop.player_id))
  if (allied.length === 0) {
    return {
      stacks: [],
      owner_modifiers: undefined,
    }
  }

  const owner_ids = [ ...new Set(allied.map(troop => troop.player_id)) ]
  const stacks: BattleStack[] = owner_ids.flatMap(owner_id => {
    const owned = allied.filter(troop => troop.player_id === owner_id)
    return stacksToBattleStacks(owned).map(stack => ({
      ...stack,
      player_id: owner_id,
    }))
  })
  const modifiers = await Promise.all(owner_ids.map(owner_id => AppService.getCombatModifiers({ player_id: owner_id })))

  return {
    stacks,
    owner_modifiers: Object.fromEntries(owner_ids.map((owner_id, index) => [
      owner_id,
      modifiers[index]
    ])),
  }
}

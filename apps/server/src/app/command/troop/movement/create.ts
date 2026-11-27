import { Factory } from '#adapter/factory'
import { AppService } from '#app/service'
import { runCommand } from '#command/run'
import { AppEvent } from '#core/events'
import { OutpostType } from '#core/outpost/constant/type'
import { OutpostEntity } from '#core/outpost/entity'
import { CombatError } from '#core/combat/error'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { MovementAction } from '#core/troop/constant/movement-action'
import {
  resolveAttackTarget,
  ResolvedAttackTarget,
} from '#app/command/troop/movement/attack-target'
import { resolveSpyTarget } from '#app/command/troop/movement/spy-target'
import { resolveReinforceTarget } from '#app/command/troop/movement/reinforce-target'
import {
  DETECTION_LEVEL_ALERT,
  IntelService,
} from '#core/intel/service'
import { TechnologyCode } from '#core/technology/constant/code'
import { TroopEntity } from '#core/troop/entity'
import { TroopError } from '#core/troop/error'
import { MovementEntity } from '#core/troop/movement/entity'
import { TroopService } from '#core/troop/service'
import { TroopCount } from '#core/troop/type'
import { WorldService } from '#core/world/service'
import { Coordinates } from '#core/world/value/coordinates'
import { Resource } from '#shared/resource'
import { now } from '#shared/time'

export interface CreateTroopMovementParams {
  player_id: string
  origin: Coordinates
  destination: Coordinates
  action: MovementAction
  move_troops: TroopCount[]
  resources?: Resource
  combat_strategy?: CombatStrategy
}

export interface CreateTroopMovementResult {
  deleted_outpost_id?: string
}

const EMPTY_RESOURCES: Resource = {
  plastic: 0,
  mushroom: 0,
  plasma: 0,
  water: 0,
}

export async function createTroopMovement({
  player_id,
  action,
  origin,
  destination,
  move_troops,
  resources = EMPTY_RESOURCES,
  combat_strategy,
}: CreateTroopMovementParams): Promise<CreateTroopMovementResult> {
  return runCommand('troop:move', async () => {
    const repository = Factory.getRepository()
    const job_queue = Factory.getJobQueue()

    let attack_target: ResolvedAttackTarget | null = null

    if (action === MovementAction.ATTACK) {
      if (!combat_strategy) {
        throw new Error(CombatError.STRATEGY_REQUIRED)
      }
      TroopService.assertAttackArmy({ move_troops })
      const attacker = await repository.player.get(player_id)
      attack_target = await resolveAttackTarget({
        attacker_player_id: player_id,
        attacker_faction_code: attacker.faction_code,
        destination,
      })
    }

    if (action === MovementAction.SPY) {
      const levels = await AppService.getTechnologyLevels({
        player_id,
        codes: [ TechnologyCode.ESPIONAGE ]
      })
      IntelService.assertEspionageLevel({ espionage_level: levels[TechnologyCode.ESPIONAGE] })
      IntelService.assertScoutsOnly({ move_troops })
      const spy = await repository.player.get(player_id)
      await resolveSpyTarget({
        spy_player_id: player_id,
        spy_faction_code: spy.faction_code,
        destination,
      })
    }

    if (action === MovementAction.REINFORCE) {
      await resolveReinforceTarget({
        player_id,
        destination,
      })
      TroopService.assertReinforcementArmy({ move_troops })
    }

    TroopService.assertTransportResources({
      action,
      resources,
      move_troops,
    })

    await AppService.assertMovementCapacity({ player_id })

    const origin_cell = await repository.cell.getCell({ coordinates: origin })

    const [
      origin_city,
      outpost
    ] = await Promise.all([
      repository.city.searchByCell({ cell_id: origin_cell.id }),
      repository.outpost.searchByCell({ cell_id: origin_cell.id }),
    ])
    // Stationed reinforcements only leave through their owner's recall (slice 033).
    const is_foreign_city = Boolean(origin_city && !origin_city.isOwnedBy(player_id))
    if (is_foreign_city) {
      await assertRecallDestination({
        player_id,
        action,
        destination,
      })
    }

    const origin_troops = await repository.troop.listInCell({
      cell_id: origin_cell.id,
      player_id,
    })

    const have_enough_troops = TroopService.haveEnoughTroops({
      origin_troops,
      move_troops,
    })
    if (!have_enough_troops) {
      throw new Error(TroopError.NOT_ENOUGH_TROOPS)
    }

    let updated_stock = null
    if (action === MovementAction.TRANSPORT) {
      const stock = await repository.resource_stock.getByCellId({ cell_id: origin_cell.id })
      updated_stock = stock.purchase({ resource: resources })
    }

    const distance = WorldService.getDistance({
      origin,
      destination,
    })

    const {
      updated_origin_troops,
      split_troops,
    } = TroopService.splitTroops({
      origin_troops: origin_troops,
      troops_to_split: move_troops,
    })

    const propulsion_level = await AppService.getTacticalPropulsionLevel({ player_id })

    const { movement, arrive_at } = TroopService.createMovement({
      player_id,
      origin,
      destination,
      action,
      distance,
      troops: split_troops,
      start_at: now(),
      resources,
      combat_strategy: action === MovementAction.ATTACK ? combat_strategy ?? null : null,
      propulsion_level,
    })

    const movement_troops = TroopService.assignToMovement({
      troops: split_troops,
      movement_id: movement.id,
    })

    let save: {
      troops_to_create: TroopEntity[]
      movement_to_create: MovementEntity
    } & ({
      type: 'update'
      troops_to_update: TroopEntity[]
    } | {
      type: 'delete'
      outpost_to_delete: OutpostEntity
      troops_to_delete: TroopEntity[]
    })

    // Only the player's own temporary outpost disappears when they leave it empty.
    if (
      outpost?.type === OutpostType.TEMPORARY
      && outpost.isOwnedBy(player_id)
      && TroopService.areTroopsEmpty({ troops: updated_origin_troops })
    ) {
      save = {
        type: 'delete',
        troops_to_create: movement_troops,
        movement_to_create: movement,
        outpost_to_delete: outpost,
        troops_to_delete: updated_origin_troops,
      }
    } else {
      save = {
        type: 'update',
        troops_to_update: updated_origin_troops,
        troops_to_create: movement_troops,
        movement_to_create: movement,
      }
    }

    await repository.movement.create(save.movement_to_create)

    const promises: Promise<void | string>[] = [
      ...save.troops_to_create.map(troop => repository.troop.create(troop)),
    ]

    if (updated_stock) {
      promises.push(repository.resource_stock.updateOne(updated_stock))
    }

    let deleted_outpost_id: string | undefined = undefined

    switch (save.type) {
    case 'update':
      promises.push(...save.troops_to_update.map(troop => repository.troop.updateOne(troop)))
      break

    case 'delete':
      promises.push(repository.outpost.delete(save.outpost_to_delete.id))
      promises.push(...save.troops_to_delete.map(troop => repository.troop.delete(troop.id)))
      deleted_outpost_id = save.outpost_to_delete.id
    }

    await Promise.all(promises)

    await job_queue.scheduleTroopMovementFinish({
      player_id,
      movement_id: movement.id,
      execute_at: arrive_at,
    })

    if (deleted_outpost_id) {
      Factory.getEventBus().emit(AppEvent.OutpostDeleted, {
        player_id,
        outpost_id: deleted_outpost_id
      })
    }

    if (origin_city && is_foreign_city) {
      Factory.getEventBus().emit(AppEvent.ReinforcementRecalled, {
        player_id: origin_city.player_id,
        city_id: origin_city.id,
        owner_player_id: player_id,
        movement_id: movement.id,
      })
    }

    if (attack_target) {
      await notifyIncomingAttack({
        defender_player_id: attack_target.defender_player_id,
        movement_id: movement.id,
        arrive_at,
      })
    }

    return { deleted_outpost_id }
  })
}

/** From another player's city only a `base` recall to one of the player's own cities or outposts is allowed. */
async function assertRecallDestination({
  player_id,
  action,
  destination,
}: {
  player_id: string
  action: MovementAction
  destination: Coordinates
}): Promise<void> {
  if (action !== MovementAction.BASE) {
    throw new Error(TroopError.MOVEMENT_FOREIGN_ORIGIN)
  }
  const repository = Factory.getRepository()
  const destination_cell = await repository.cell.getCell({ coordinates: destination })
  const [
    city,
    outpost
  ] = await Promise.all([
    repository.city.searchByCell({ cell_id: destination_cell.id }),
    repository.outpost.searchByCell({ cell_id: destination_cell.id }),
  ])
  if (!city?.isOwnedBy(player_id) && !outpost?.isOwnedBy(player_id)) {
    throw new Error(TroopError.MOVEMENT_FOREIGN_ORIGIN)
  }
}

/** Warns the defender of a new attack once they have `detection` ≥ 1 (slice 030). */
async function notifyIncomingAttack({
  defender_player_id,
  movement_id,
  arrive_at,
}: {
  defender_player_id: string
  movement_id: string
  arrive_at: number
}): Promise<void> {
  const levels = await AppService.getTechnologyLevels({
    player_id: defender_player_id,
    codes: [ TechnologyCode.DETECTION ]
  })
  if (levels[TechnologyCode.DETECTION] < DETECTION_LEVEL_ALERT) {
    return
  }

  Factory.getEventBus().emit(AppEvent.MovementIncoming, {
    player_id: defender_player_id,
    movement_id,
    arrive_at,
  })
}

import assert from 'assert'
import { Factory } from '#adapter/factory'
import {
  resolveOwnedDepositTarget
} from '#app/command/troop/movement/shared'
import { runCommand } from '#command/run'
import { AppService } from '#app/service'
import { ReportEntity } from '#core/communication/report/entity'
import { ReportFactory } from '#core/communication/report/factory'
import { ReportType } from '#core/communication/value/report-type'
import { MovementAction } from '#core/troop/constant/movement-action'
import { FactionCode } from '#core/faction/constant/code'
import { TroopEntity } from '#core/troop/entity'
import { TroopError } from '#core/troop/error'
import { MovementEntity } from '#core/troop/movement/entity'
import { TroopService } from '#core/troop/service'
import { OutpostEntity } from '#core/outpost/entity'
import { OutpostType } from '#core/outpost/constant/type'
import { OutpostService } from '#core/outpost/service'
import { OutpostError } from '#core/outpost/error'
import { ResourceStockEntity } from '#core/resources/resource-stock/entity'
import { CellEntity } from '#core/world/cell/entity'
import { Resource, WarehouseCapacity } from '#shared/resource'
import { id } from '#shared/identification'

export interface FinishTroopBaseMovementParams {
  player_id: string
  movement_id: string
  arrived_at: number
}

export interface FinishTroopBaseMovementResult {
  is_outpost_created: boolean
}

interface FinishBaseSave {
  delete_movement_id: string
  updated_troops: TroopEntity[]
  delete_troop_ids: string[]
  report: ReportEntity
  outpost?: OutpostEntity
  updated_stock?: ResourceStockEntity
  ensure_stock_cell_id?: string
}

function finishBaseMovementInLocation({
  movement,
  movement_troops,
  destination_cell_id,
  existing_destination_troops,
  arrived_at,
}: {
  movement: MovementEntity
  movement_troops: TroopEntity[]
  existing_destination_troops: TroopEntity[]
  destination_cell_id: string
  arrived_at: number
}): FinishBaseSave {
  const updated_troops = TroopService.mergeTroopsInCell({
    movement_troops,
    destination_troops: existing_destination_troops,
    cell_id: destination_cell_id,
  })

  const report = ReportFactory.generateUnread({
    type: ReportType.BASE,
    movement,
    troops: movement_troops,
    recorded_at: arrived_at,
    resources: movement.hasResources() ? movement.resources : undefined,
  })

  return {
    delete_movement_id: movement.id,
    delete_troop_ids: movement_troops.map(troop => troop.id),
    updated_troops,
    report,
  }
}

function finishBaseMovementInTemporaryOutpost({
  destination_cell_id,
  movement,
  existing_outposts_count,
  player_id,
  faction_code,
  movement_troops,
  arrived_at,
}: {
  destination_cell_id: string
  movement: MovementEntity
  existing_outposts_count: number
  player_id: string
  faction_code: FactionCode
  movement_troops: TroopEntity[]
  arrived_at: number
}): FinishBaseSave {
  const is_limit_reached = OutpostService.isLimitReached({ existing_outposts_count })
  if (is_limit_reached) {
    throw new Error(OutpostError.LIMIT_REACHED)
  }

  const destination_troops = TroopService.init({
    player_id,
    cell_id: destination_cell_id,
    faction_code,
  })

  const updated_troops = TroopService.mergeTroopsInCell({
    movement_troops,
    destination_troops,
    cell_id: destination_cell_id,
  })

  const report = ReportFactory.generateUnread({
    type: ReportType.BASE,
    movement,
    troops: movement_troops,
    recorded_at: arrived_at,
    resources: movement.hasResources() ? movement.resources : undefined,
  })

  const outpost = OutpostEntity.create({
    id: id(),
    player_id,
    cell_id: destination_cell_id,
    type: OutpostType.TEMPORARY,
  })

  return {
    delete_movement_id: movement.id,
    delete_troop_ids: movement_troops.map(troop => troop.id),
    updated_troops,
    report,
    outpost,
  }
}

async function planCargoDeposit({
  cell_id,
  resources,
  warehouses_capacity,
}: {
  cell_id: string
  resources: Resource
  warehouses_capacity: WarehouseCapacity
}): Promise<ResourceStockEntity> {
  const repository = Factory.getRepository()
  const stock = await repository.resource_stock.getByCellId({ cell_id })
  const { stock: updated_stock } = stock.depositUpToCapacity({
    resource: resources,
    warehouses_capacity,
  })
  return updated_stock
}

async function buildSettlePlan({
  player_id,
  movement,
  destination_cell,
  arrived_at,
}: {
  player_id: string
  movement: MovementEntity
  destination_cell: CellEntity
  arrived_at: number
}): Promise<FinishBaseSave> {
  const repository = Factory.getRepository()
  const city = await repository.city.searchByCell({ cell_id: destination_cell.id })
  const city_exists = Boolean(city)
  const outpost_exists = await repository.outpost.existsOnCell({ cell_id: destination_cell.id })
  const should_build_temporary_outpost = OutpostService.shouldBuildTemporaryOutpost({
    city_exists,
    outpost_exists,
  })

  if (!should_build_temporary_outpost) {
    const [
      movement_troops,
      existing_destination_troops
    ] = await Promise.all([
      repository.troop.listByMovement({ movement_id: movement.id }),
      repository.troop.listInCell({
        cell_id: destination_cell.id,
        player_id,
      }),
    ])
    return finishBaseMovementInLocation({
      movement,
      movement_troops,
      destination_cell_id: destination_cell.id,
      existing_destination_troops,
      arrived_at,
    })
  }

  const [
    movement_troops,
    existing_outposts_count,
    player
  ] = await Promise.all([
    repository.troop.listByMovement({ movement_id: movement.id }),
    repository.outpost.countForPlayer({ player_id }),
    repository.player.get(player_id),
  ])
  return finishBaseMovementInTemporaryOutpost({
    destination_cell_id: destination_cell.id,
    movement,
    existing_outposts_count,
    movement_troops,
    player_id,
    faction_code: player.faction_code,
    arrived_at,
  })
}

async function attachCargoToSave({
  finish_save,
  movement,
  destination_cell,
  player_id,
}: {
  finish_save: FinishBaseSave
  movement: MovementEntity
  destination_cell: CellEntity
  player_id: string
}): Promise<FinishBaseSave> {
  if (!movement.hasResources()) {
    return finish_save
  }

  const repository = Factory.getRepository()

  if (finish_save.outpost) {
    await repository.resource_stock.ensureWorldStockForCell({
      cell_id: finish_save.outpost.cell_id,
    })
    const warehouses_capacity = await AppService.getOutpostWarehousesCapacity({ player_id })
    const updated_stock = await planCargoDeposit({
      cell_id: finish_save.outpost.cell_id,
      resources: movement.resources,
      warehouses_capacity,
    })
    return {
      ...finish_save,
      updated_stock,
      ensure_stock_cell_id: finish_save.outpost.cell_id,
    }
  }

  const deposit_target = await resolveOwnedDepositTarget({
    destination_cell,
    player_id,
  })
  if (!deposit_target) {
    return finish_save
  }

  const updated_stock = await planCargoDeposit({
    cell_id: deposit_target.cell_id,
    resources: movement.resources,
    warehouses_capacity: deposit_target.warehouses_capacity,
  })
  return {
    ...finish_save,
    updated_stock,
  }
}

async function persistFinishBaseSave(finish_save: FinishBaseSave): Promise<void> {
  const repository = Factory.getRepository()
  const save_promises: Promise<unknown>[] = [
    repository.report.create(finish_save.report),
    repository.movement.delete(finish_save.delete_movement_id),
    ...finish_save.updated_troops.map(troop => repository.troop.updateOne(troop, { upsert: true })),
    ...finish_save.delete_troop_ids.map(troop_id => repository.troop.delete(troop_id)),
  ]
  if (finish_save.updated_stock) {
    save_promises.push(repository.resource_stock.updateOne(finish_save.updated_stock))
  }
  if (finish_save.outpost) {
    save_promises.push(repository.outpost.create(finish_save.outpost))
    if (!finish_save.ensure_stock_cell_id) {
      save_promises.push(
        repository.resource_stock.ensureWorldStockForCell({ cell_id: finish_save.outpost.cell_id }),
      )
    }
  }
  await Promise.all(save_promises)
}

export async function finishTroopBaseMovement({
  player_id,
  movement_id,
  arrived_at,
}: FinishTroopBaseMovementParams): Promise<FinishTroopBaseMovementResult> {
  return runCommand('troop:finish:base', async () => {
    const repository = Factory.getRepository()

    const movement = await repository.movement.getById(movement_id)

    assert.strictEqual(movement.action, MovementAction.BASE)

    if (!movement.isOwnedBy(player_id)) {
      throw new Error(TroopError.MOVEMENT_NOT_OWNER)
    }

    const destination_cell = await repository.cell.getCell({ coordinates: movement.destination })

    let finish_save = await buildSettlePlan({
      player_id,
      movement,
      destination_cell,
      arrived_at,
    })

    finish_save = await attachCargoToSave({
      finish_save,
      movement,
      destination_cell,
      player_id,
    })

    await persistFinishBaseSave(finish_save)

    return { is_outpost_created: Boolean(finish_save.outpost) }
  })
}

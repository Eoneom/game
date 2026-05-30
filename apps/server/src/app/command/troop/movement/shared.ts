import { Factory } from '#adapter/factory'
import { AppService } from '#app/service'
import { MovementAction } from '#core/troop/constant/movement-action'
import { TroopEntity } from '#core/troop/entity'
import { MovementEntity } from '#core/troop/movement/entity'
import { TroopService } from '#core/troop/service'
import { CellEntity } from '#core/world/cell/entity'
import { WorldService } from '#core/world/service'
import { Resource } from '#shared/resource'
import { now } from '#shared/time'

export async function createReturnBaseTrip({
  inbound_movement,
  troops,
  arrived_at,
  resources,
  schedule,
}: {
  inbound_movement: MovementEntity
  troops: TroopEntity[]
  arrived_at: number
  resources?: Resource
  schedule: 'if_future' | 'always'
}): Promise<{ base_movement: MovementEntity; base_arrive_at: number }> {
  const repository = Factory.getRepository()
  const job_queue = Factory.getJobQueue()

  const distance = WorldService.getDistance({
    origin: inbound_movement.destination,
    destination: inbound_movement.origin,
  })

  const { movement: base_movement, arrive_at: base_arrive_at } = TroopService.createMovement({
    troops,
    start_at: arrived_at,
    distance,
    origin: inbound_movement.destination,
    destination: inbound_movement.origin,
    player_id: inbound_movement.player_id,
    action: MovementAction.BASE,
    resources,
  })

  const base_troops = TroopService.assignToMovement({
    troops,
    movement_id: base_movement.id,
  })

  await repository.movement.create(base_movement)

  await Promise.all([
    repository.movement.delete(inbound_movement.id),
    ...base_troops.map(troop => repository.troop.updateOne(troop)),
  ])

  const should_schedule = schedule === 'always' || base_arrive_at > now()
  if (should_schedule) {
    await job_queue.scheduleTroopMovementFinish({
      player_id: inbound_movement.player_id,
      movement_id: base_movement.id,
      execute_at: base_arrive_at,
    })
  }

  return { base_movement, base_arrive_at }
}

export async function resolveOwnedDepositTarget({
  destination_cell,
  player_id,
}: {
  destination_cell: CellEntity
  player_id: string
}): Promise<{ cell_id: string; warehouses_capacity: Resource } | null> {
  const repository = Factory.getRepository()

  const city = destination_cell.city_id
    ? await repository.city.get(destination_cell.city_id)
    : null
  const outpost = await repository.outpost.searchByCell({ cell_id: destination_cell.id })

  const owned_city = city?.isOwnedBy(player_id) ? city : null
  const owned_outpost = outpost?.isOwnedBy(player_id) ? outpost : null

  if (!owned_city && !owned_outpost) {
    return null
  }

  const warehouses_capacity = owned_city
    ? await AppService.getCityWarehousesCapacity({ city_id: owned_city.id })
    : await AppService.getOutpostWarehousesCapacity({ player_id })

  return {
    cell_id: destination_cell.id,
    warehouses_capacity,
  }
}

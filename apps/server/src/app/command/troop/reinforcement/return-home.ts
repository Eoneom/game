import { Factory } from '#adapter/factory'
import { AppService } from '#app/service'
import { CityEntity } from '#core/city/entity'
import { AppEvent } from '#core/events'
import { MovementAction } from '#core/troop/constant/movement-action'
import { TroopEntity } from '#core/troop/entity'
import { TroopService } from '#core/troop/service'
import { WorldService } from '#core/world/service'
import { Coordinates } from '#core/world/value/coordinates'

/** A reinforcement sent home: the host is told with `reinforcement:recalled`. */
export type ReturnedReinforcement = {
  host_player_id: string
  city_id: string
  owner_player_id: string
  movement_id: string
}

/** The owner's closest city, or closest outpost when they hold no city; `null` when they hold neither. */
async function closestHome({
  owner_player_id,
  from,
}: {
  owner_player_id: string
  from: Coordinates
}): Promise<Coordinates | null> {
  const repository = Factory.getRepository()
  const cities = await repository.city.list({ player_id: owner_player_id })
  const cell_ids = cities.length > 0
    ? cities.map(city => city.cell_id)
    : (await repository.outpost.list({ player_id: owner_player_id })).map(outpost => outpost.cell_id)
  if (cell_ids.length === 0) {
    return null
  }
  const cells = await Promise.all(cell_ids.map(cell_id => repository.cell.getById(cell_id)))
  return cells
    .map(cell => cell.coordinates)
    .reduce((best, coordinates) => WorldService.getDistance({
      origin: from,
      destination: coordinates
    }) < WorldService.getDistance({
      origin: from,
      destination: best
    }) ? coordinates : best)
}

/**
 * Automatic return of stationed troops (slice 033): one `base` movement from the host city to the owner's
 * closest city, not blocked by the movement cap. An owner without any city or outpost keeps the troops stationed.
 */
async function sendHome({
  owner_player_id,
  troops,
  city,
  at,
}: {
  owner_player_id: string
  troops: TroopEntity[]
  city: CityEntity
  at: number
}): Promise<ReturnedReinforcement | null> {
  const repository = Factory.getRepository()
  const job_queue = Factory.getJobQueue()

  const host_cell = await repository.cell.getById(city.cell_id)
  const destination = await closestHome({
    owner_player_id,
    from: host_cell.coordinates,
  })
  if (!destination) {
    return null
  }

  const propulsion_level = await AppService.getTacticalPropulsionLevel({ player_id: owner_player_id })
  const {
    movement,
    arrive_at
  } = TroopService.createMovement({
    troops,
    start_at: at,
    distance: WorldService.getDistance({
      origin: host_cell.coordinates,
      destination,
    }),
    origin: host_cell.coordinates,
    destination,
    player_id: owner_player_id,
    action: MovementAction.BASE,
    propulsion_level,
  })

  await repository.movement.create(movement)
  await Promise.all(troops.map(troop => repository.troop.updateOne(troop.assignToMovement({ movement_id: movement.id }))))
  await job_queue.scheduleTroopMovementFinish({
    player_id: owner_player_id,
    movement_id: movement.id,
    execute_at: arrive_at,
  })

  return {
    host_player_id: city.player_id,
    city_id: city.id,
    owner_player_id,
    movement_id: movement.id,
  }
}

/** The player's troops stationed in cities of `host_player_ids`. */
async function returnStationedAbroad({
  player_id,
  host_player_ids,
  at,
}: {
  player_id: string
  host_player_ids: Set<string>
  at: number
}): Promise<ReturnedReinforcement[]> {
  const repository = Factory.getRepository()
  const abroad = await repository.troop.listStationedAbroad({ player_id })
  const cell_ids = [ ...new Set(abroad.map(troop => troop.cell_id as string)) ]

  const returned: ReturnedReinforcement[] = []
  for (const cell_id of cell_ids) {
    const city = await repository.city.searchByCell({ cell_id })
    if (!city || !host_player_ids.has(city.player_id)) {
      continue
    }
    const result = await sendHome({
      owner_player_id: player_id,
      troops: abroad.filter(troop => troop.cell_id === cell_id),
      city,
      at,
    })
    if (result) {
      returned.push(result)
    }
  }
  return returned
}

/** Reinforcements of `owner_player_ids` stationed in the player's cities. */
async function returnStationedAtHome({
  player_id,
  owner_player_ids,
  at,
}: {
  player_id: string
  owner_player_ids: Set<string>
  at: number
}): Promise<ReturnedReinforcement[]> {
  const repository = Factory.getRepository()
  const cities = await repository.city.list({ player_id })

  const returned: ReturnedReinforcement[] = []
  for (const city of cities) {
    const reinforcements = await repository.troop.listReinforcementsInCell({
      cell_id: city.cell_id,
      host_player_id: player_id,
    })
    const owner_ids = [ ...new Set(reinforcements.map(troop => troop.player_id)) ]
      .filter(owner_id => owner_player_ids.has(owner_id))
    for (const owner_id of owner_ids) {
      const result = await sendHome({
        owner_player_id: owner_id,
        troops: reinforcements.filter(troop => troop.player_id === owner_id),
        city,
        at,
      })
      if (result) {
        returned.push(result)
      }
    }
  }
  return returned
}

/**
 * Departure from an alliance (leave, kick): reinforcements between the departing player and the
 * remaining members go home, in both directions.
 */
export async function returnReinforcementsBetween({
  player_id,
  other_player_ids,
  at,
}: {
  player_id: string
  other_player_ids: string[]
  at: number
}): Promise<ReturnedReinforcement[]> {
  const others = new Set(other_player_ids.filter(other_id => other_id !== player_id))
  if (others.size === 0) {
    return []
  }
  return [
    ...await returnStationedAbroad({
      player_id,
      host_player_ids: others,
      at,
    }),
    ...await returnStationedAtHome({
      player_id,
      owner_player_ids: others,
      at,
    }),
  ]
}

/** Dissolve: every reinforcement between members goes home. */
export async function returnReinforcementsAmong({
  player_ids,
  at,
}: {
  player_ids: string[]
  at: number
}): Promise<ReturnedReinforcement[]> {
  const members = new Set(player_ids)
  const returned: ReturnedReinforcement[] = []
  for (const player_id of player_ids) {
    returned.push(...await returnStationedAbroad({
      player_id,
      host_player_ids: members,
      at,
    }))
  }
  return returned
}

export function emitReinforcementsRecalled(returned: ReturnedReinforcement[]): void {
  const event_bus = Factory.getEventBus()
  for (const entry of returned) {
    event_bus.emit(AppEvent.ReinforcementRecalled, {
      player_id: entry.host_player_id,
      city_id: entry.city_id,
      owner_player_id: entry.owner_player_id,
      movement_id: entry.movement_id,
    })
  }
}

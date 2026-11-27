import type { MockInstance } from 'vitest'
import { Factory } from '#adapter/factory'
import { AppService } from '#app/service'
import { AppEventBus } from '#app/event-bus'
import { JobQueue } from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import {
  emitReinforcementsRecalled,
  returnReinforcementsAmong,
  returnReinforcementsBetween
} from '#app/command/troop/reinforcement/return-home'
import { CityEntity } from '#core/city/entity'
import { AppEvent } from '#core/events'
import { TroopCode } from '#core/troop/constant/code'
import { MovementAction } from '#core/troop/constant/movement-action'
import { TroopEntity } from '#core/troop/entity'
import { MovementEntity } from '#core/troop/movement/entity'
import { CellEntity } from '#core/world/cell/entity'
import { CellType } from '#core/world/value/cell-type'
import { Coordinates } from '#core/world/value/coordinates'

describe('automatic reinforcement return (slice 033)', () => {
  const cell = (id: string, coordinates: Coordinates) => CellEntity.create({
    id,
    coordinates,
    type: CellType.FOREST,
    resource_coefficient: {
      plastic: 1,
      mushroom: 1,
      plasma: 0
    },
    solar_coefficient: 1,
  })
  const cells = [
    cell('leaver-far', {
      x: 50,
      y: 50 
    }),
    cell('leaver-near', {
      x: 6,
      y: 6 
    }),
    cell('ally-city', {
      x: 5,
      y: 5 
    }),
    cell('other-ally-city', {
      x: 20,
      y: 20 
    }),
  ]
  const cities = [
    CityEntity.create({
      id: 'leaver-far',
      player_id: 'leaver',
      name: 'Loin',
      cell_id: 'leaver-far' 
    }),
    CityEntity.create({
      id: 'leaver-near',
      player_id: 'leaver',
      name: 'Près',
      cell_id: 'leaver-near' 
    }),
    CityEntity.create({
      id: 'ally-city',
      player_id: 'ally',
      name: 'Allié',
      cell_id: 'ally-city' 
    }),
    CityEntity.create({
      id: 'other-ally-city',
      player_id: 'other',
      name: 'Autre',
      cell_id: 'other-ally-city' 
    }),
  ]
  const stationed = (id: string, player_id: string, cell_id: string) => TroopEntity.create({
    id,
    player_id,
    cell_id,
    code: TroopCode.LEGIONNAIRE,
    count: 5,
    movement_id: null,
  })

  let troops: TroopEntity[]
  let movementCreate: MockInstance
  let troopUpdateOne: MockInstance
  let scheduleTroopMovementFinish: MockInstance

  beforeEach(() => {
    troops = [
      // The leaver's troops in an ally's city, and in a city of someone who stays out of the departure.
      stationed('leaver-in-ally', 'leaver', 'ally-city'),
      stationed('leaver-in-other', 'leaver', 'other-ally-city'),
      // An ally's troops in the leaver's city.
      stationed('ally-in-leaver', 'ally', 'leaver-near'),
    ]
    movementCreate = vi.fn().mockResolvedValue(undefined)
    troopUpdateOne = vi.fn().mockResolvedValue(undefined)
    scheduleTroopMovementFinish = vi.fn().mockResolvedValue('job')

    vi.spyOn(AppService, 'getTacticalPropulsionLevel').mockResolvedValue(0)
    const capacity = vi.spyOn(AppService, 'assertMovementCapacity')
    capacity.mockRejectedValue(new Error('the automatic return must not check the cap'))
    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      cell: { getById: vi.fn(async (id: string) => cells.find(candidate => candidate.id === id)) },
      city: {
        list: vi.fn(async ({ player_id }: { player_id: string }) => cities.filter(candidate => candidate.player_id === player_id)),
        searchByCell: vi.fn(async ({ cell_id }: { cell_id: string }) => cities.find(candidate => candidate.cell_id === cell_id) ?? null),
      },
      outpost: { list: vi.fn().mockResolvedValue([]) },
      troop: {
        listStationedAbroad: vi.fn(async ({ player_id }: { player_id: string }) => troops.filter(candidate => candidate.player_id === player_id
          && cities.some(city => city.cell_id === candidate.cell_id && city.player_id !== player_id))),
        listReinforcementsInCell: vi.fn(async ({
          cell_id, host_player_id
        }: { cell_id: string, host_player_id: string }) => troops.filter(candidate => candidate.cell_id === cell_id && candidate.player_id !== host_player_id)),
        updateOne: troopUpdateOne,
      },
      movement: { create: movementCreate },
    } as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ scheduleTroopMovementFinish } as unknown as JobQueue)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sends reinforcements between the departing player and the remaining members home, both ways', async () => {
    const returned = await returnReinforcementsBetween({
      player_id: 'leaver',
      other_player_ids: [ 'ally' ],
      at: 1000,
    })

    expect(returned).toEqual([
      {
        host_player_id: 'ally',
        city_id: 'ally-city',
        owner_player_id: 'leaver',
        movement_id: expect.any(String)
      },
      {
        host_player_id: 'leaver',
        city_id: 'leaver-near',
        owner_player_id: 'ally',
        movement_id: expect.any(String)
      },
    ])
    const movements = movementCreate.mock.calls.map(call => call[0] as MovementEntity)
    // The leaver's troops go to their closest city, the ally's to the ally's city.
    // Automatic returns are listed under « Retours » (slice 045).
    expect(movements.every(movement => movement.is_return)).toBe(true)
    // They leave at the departure time (slice 044 `departure_at`).
    expect(movements.every(movement => movement.started_at === 1000)).toBe(true)
    expect(movements.map(movement => ({
      player_id: movement.player_id,
      action: movement.action,
      origin: movement.origin,
      destination: movement.destination,
    }))).toEqual([
      {
        player_id: 'leaver',
        action: MovementAction.BASE,
        origin: {
          x: 5,
          y: 5 
        },
        destination: {
          x: 6,
          y: 6 
        }
      },
      {
        player_id: 'ally',
        action: MovementAction.BASE,
        origin: {
          x: 6,
          y: 6 
        },
        destination: {
          x: 5,
          y: 5 
        }
      },
    ])
    const moved = troopUpdateOne.mock.calls.map(call => call[0] as TroopEntity)
    expect(moved.map(troop => [
      troop.id,
      troop.cell_id,
      troop.movement_id 
    ])).toEqual([
      [
        'leaver-in-ally',
        null,
        movements[0].id 
      ],
      [
        'ally-in-leaver',
        null,
        movements[1].id 
      ],
    ])
    expect(scheduleTroopMovementFinish).toHaveBeenCalledTimes(2)
  })

  it('returns every reinforcement between members on dissolve', async () => {
    const returned = await returnReinforcementsAmong({
      player_ids: [
        'leaver',
        'ally',
        'other' 
      ],
      at: 1000,
    })
    expect(returned.map(entry => entry.city_id).sort()).toEqual([
      'ally-city',
      'leaver-near',
      'other-ally-city' 
    ])
  })

  it('emits reinforcement:recalled to each host', () => {
    const emit = vi.fn()
    vi.spyOn(Factory, 'getEventBus').mockReturnValue({ emit } as unknown as AppEventBus)

    emitReinforcementsRecalled([
      {
        host_player_id: 'ally',
        city_id: 'ally-city',
        owner_player_id: 'leaver',
        movement_id: 'm1'
      },
    ])

    expect(emit).toHaveBeenCalledWith(AppEvent.ReinforcementRecalled, {
      player_id: 'ally',
      city_id: 'ally-city',
      owner_player_id: 'leaver',
      movement_id: 'm1',
    })
  })
})

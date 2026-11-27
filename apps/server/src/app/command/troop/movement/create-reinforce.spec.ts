import type { MockInstance } from 'vitest'
import { createTroopMovement } from '#app/command/troop/movement/create'
import { Factory } from '#adapter/factory'
import { AppService } from '#app/service'
import { JobQueue } from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import { AllianceRole } from '#core/alliance/constant/role'
import { AllianceError } from '#core/alliance/error'
import { CityEntity } from '#core/city/entity'
import { AppEvent } from '#core/events'
import { OutpostType } from '#core/outpost/constant/type'
import { OutpostEntity } from '#core/outpost/entity'
import { TroopCode } from '#core/troop/constant/code'
import { MovementAction } from '#core/troop/constant/movement-action'
import { TroopEntity } from '#core/troop/entity'
import { TroopError } from '#core/troop/error'
import { MovementEntity } from '#core/troop/movement/entity'
import { CellEntity } from '#core/world/cell/entity'
import { CellType } from '#core/world/value/cell-type'
import { Coordinates } from '#core/world/value/coordinates'

describe('createTroopMovement reinforce and recall (slice 033)', () => {
  const owner_id = 'owner'
  const host_id = 'host'
  const stranger_id = 'stranger'

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
    cell('owner-cell', {
      x: 1,
      y: 1 
    }),
    cell('host-cell', {
      x: 5,
      y: 5 
    }),
    cell('stranger-cell', {
      x: 9,
      y: 9 
    }),
    cell('owner-outpost-cell', {
      x: 2,
      y: 2 
    }),
    cell('empty-cell', {
      x: 7,
      y: 7 
    }),
  ]
  const at = (cell_id: string) => cells.find(candidate => candidate.id === cell_id)!.coordinates
  const city = (id: string, player_id: string, cell_id: string) => CityEntity.create({
    id,
    player_id,
    name: id,
    cell_id,
  })
  const cities = [
    city('owner-city', owner_id, 'owner-cell'),
    city('host-city', host_id, 'host-cell'),
    city('stranger-city', stranger_id, 'stranger-cell'),
  ]
  const outposts = [
    OutpostEntity.create({
      id: 'owner-outpost',
      player_id: owner_id,
      cell_id: 'owner-outpost-cell',
      type: OutpostType.PERMANENT,
    }),
  ]
  const troop = (id: string, player_id: string, cell_id: string, code: TroopCode, count: number) => TroopEntity.create({
    id,
    player_id,
    cell_id,
    code,
    count,
    movement_id: null,
  })

  let troops: TroopEntity[]
  let memberships: Record<string, string>
  let getMovementCapacity: MockInstance
  let listInCell: MockInstance
  let movementCreate: MockInstance
  let emit: MockInstance

  beforeEach(() => {
    troops = [
      troop('owner-legion', owner_id, 'owner-cell', TroopCode.LEGIONNAIRE, 10),
      troop('owner-explorer', owner_id, 'owner-cell', TroopCode.EXPLORER, 3),
      // Reinforcement already stationed in the host city, next to the host's own legionnaires.
      troop('owner-legion-abroad', owner_id, 'host-cell', TroopCode.LEGIONNAIRE, 4),
      troop('host-legion', host_id, 'host-cell', TroopCode.LEGIONNAIRE, 7),
    ]
    memberships = {
      [owner_id]: 'a1',
      [host_id]: 'a1',
      [stranger_id]: 'a2',
    }

    vi.spyOn(AppService, 'getTacticalPropulsionLevel').mockResolvedValue(0)
    getMovementCapacity = vi.spyOn(AppService, 'getMovementCapacity').mockResolvedValue({
      used: 0,
      limit: 5
    })
    listInCell = vi.fn(async ({
      cell_id, player_id
    }: { cell_id: string, player_id: string }) => troops.filter(candidate => candidate.cell_id === cell_id && candidate.player_id === player_id))
    movementCreate = vi.fn().mockResolvedValue(undefined)
    emit = vi.fn()

    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      cell: { getCell: vi.fn(async ({ coordinates }: { coordinates: Coordinates }) => cells.find(candidate => candidate.coordinates.x === coordinates.x && candidate.coordinates.y === coordinates.y)) },
      city: { searchByCell: vi.fn(async ({ cell_id }: { cell_id: string }) => cities.find(candidate => candidate.cell_id === cell_id) ?? null) },
      outpost: { searchByCell: vi.fn(async ({ cell_id }: { cell_id: string }) => outposts.find(candidate => candidate.cell_id === cell_id) ?? null) },
      alliance: {
        findMembership: vi.fn(async (player_id: string) => memberships[player_id]
          ? {
            alliance_id: memberships[player_id],
            player_id,
            role: AllianceRole.MEMBRE,
            joined_at: 0
          }
          : null),
      },
      troop: {
        listInCell,
        create: vi.fn().mockResolvedValue(undefined),
        updateOne: vi.fn().mockResolvedValue(undefined),
      },
      movement: { create: movementCreate },
      exchange: { listReservedInCell: vi.fn().mockResolvedValue([]) },
    } as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ scheduleTroopMovementFinish: vi.fn().mockResolvedValue('job') } as unknown as JobQueue)
    vi.spyOn(Factory, 'getEventBus').mockReturnValue({ emit } as never)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const reinforce = (destination: Coordinates, move_troops = [
    {
      code: TroopCode.LEGIONNAIRE,
      count: 5 
    } 
  ]) => createTroopMovement({
    player_id: owner_id,
    origin: at('owner-cell'),
    destination,
    action: MovementAction.REINFORCE,
    move_troops,
  })

  describe('reinforce', () => {
    it('sends combat troops to a city of another alliance member', async () => {
      await reinforce(at('host-cell'))

      expect(movementCreate).toHaveBeenCalledTimes(1)
      const movement = movementCreate.mock.calls[0][0] as MovementEntity
      expect(movement).toMatchObject({
        player_id: owner_id,
        action: MovementAction.REINFORCE,
        destination: at('host-cell'),
      })
    })

    it.each([
      [
        'own city',
        'owner-cell' 
      ],
      [
        'city of a non-member',
        'stranger-cell' 
      ],
      [
        'outpost',
        'owner-outpost-cell' 
      ],
      [
        'empty cell',
        'empty-cell' 
      ],
    ])('rejects an %s', async (_label, cell_id) => {
      await expect(reinforce(at(cell_id))).rejects.toThrow(AllianceError.INVALID_REINFORCE_TARGET)
      expect(movementCreate).not.toHaveBeenCalled()
    })

    it('rejects a player without alliance', async () => {
      delete memberships[owner_id]
      await expect(reinforce(at('host-cell'))).rejects.toThrow(AllianceError.INVALID_REINFORCE_TARGET)
    })

    it('accepts combat troops only, at least one', async () => {
      await expect(reinforce(at('host-cell'), [
        {
          code: TroopCode.LEGIONNAIRE,
          count: 5 
        },
        {
          code: TroopCode.EXPLORER,
          count: 1 
        },
      ])).rejects.toThrow(AllianceError.COMBAT_TROOPS_ONLY)
      await expect(reinforce(at('host-cell'), [])).rejects.toThrow(AllianceError.COMBAT_TROOPS_ONLY)
    })

    it('counts toward the movement cap', async () => {
      getMovementCapacity.mockResolvedValue({
        used: 5,
        limit: 5
      })
      await expect(reinforce(at('host-cell'))).rejects.toThrow(TroopError.MOVEMENT_LIMIT_REACHED)
    })
  })

  describe('recall', () => {
    const recall = (action: MovementAction, destination: Coordinates, player_id = owner_id) => createTroopMovement({
      player_id,
      origin: at('host-cell'),
      destination,
      action,
      move_troops: [
        {
          code: TroopCode.LEGIONNAIRE,
          count: 4 
        } 
      ],
    })

    it('lets the owner bring stationed troops back to an own city and tells the host', async () => {
      await recall(MovementAction.BASE, at('owner-cell'))

      // Only the owner's own stack on the host cell is read, never the host's legionnaires.
      expect(listInCell).toHaveBeenCalledWith({
        cell_id: 'host-cell',
        player_id: owner_id
      })
      const movement = movementCreate.mock.calls[0][0] as MovementEntity
      expect(movement).toMatchObject({
        player_id: owner_id,
        action: MovementAction.BASE,
        origin: at('host-cell'),
      })
      expect(emit).toHaveBeenCalledWith(AppEvent.ReinforcementRecalled, {
        player_id: host_id,
        city_id: 'host-city',
        owner_player_id: owner_id,
        movement_id: movement.id,
      })
    })

    it('accepts an own outpost as destination', async () => {
      await recall(MovementAction.BASE, at('owner-outpost-cell'))
      expect(movementCreate).toHaveBeenCalledTimes(1)
    })

    it('counts toward the movement cap', async () => {
      getMovementCapacity.mockResolvedValue({
        used: 5,
        limit: 5
      })
      await expect(recall(MovementAction.BASE, at('owner-cell'))).rejects.toThrow(TroopError.MOVEMENT_LIMIT_REACHED)
    })

    it.each([
      [
        MovementAction.ATTACK,
        'stranger-cell' 
      ],
      [
        MovementAction.TRANSPORT,
        'owner-cell' 
      ],
      [
        MovementAction.EXPLORE,
        'empty-cell' 
      ],
      [
        MovementAction.REINFORCE,
        'owner-cell' 
      ],
      [
        MovementAction.BASE,
        'empty-cell' 
      ],
      [
        MovementAction.BASE,
        'stranger-cell' 
      ],
    ])('rejects %s to %s from a foreign cell', async (action, cell_id) => {
      await expect(recall(action, at(cell_id))).rejects.toThrow()
      expect(movementCreate).not.toHaveBeenCalled()
    })

    it('rejects a base to a cell the owner does not hold with troop:movement:foreign-origin', async () => {
      await expect(recall(MovementAction.BASE, at('empty-cell'))).rejects.toThrow(TroopError.MOVEMENT_FOREIGN_ORIGIN)
    })

    it('never lets the host move the reinforcement: the host only sees their own troops', async () => {
      await expect(createTroopMovement({
        player_id: host_id,
        origin: at('host-cell'),
        destination: at('empty-cell'),
        action: MovementAction.BASE,
        move_troops: [
          {
            code: TroopCode.LEGIONNAIRE,
            count: 11 
          } 
        ],
      })).rejects.toThrow(TroopError.NOT_ENOUGH_TROOPS)
      expect(listInCell).toHaveBeenCalledWith({
        cell_id: 'host-cell',
        player_id: host_id
      })
    })
  })
})

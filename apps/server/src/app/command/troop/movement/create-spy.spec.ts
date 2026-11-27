import type { MockInstance } from 'vitest'
import assert from 'assert'
import { createTroopMovement } from '#app/command/troop/movement/create'
import { Factory } from '#adapter/factory'
import { AppService } from '#app/service'
import { JobQueue } from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import { CombatError } from '#core/combat/error'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { AppEvent } from '#core/events'
import { FactionCode } from '#core/faction/constant/code'
import { IntelError } from '#core/intel/error'
import { TechnologyCode } from '#core/technology/constant/code'
import { TroopCode } from '#core/troop/constant/code'
import { MovementAction } from '#core/troop/constant/movement-action'
import { TroopEntity } from '#core/troop/entity'
import { TroopError } from '#core/troop/error'
import { CellEntity } from '#core/world/cell/entity'
import { CellType } from '#core/world/value/cell-type'

describe('createTroopMovement spy and incoming attacks (slice 030)', () => {
  const player_id = 'spy-id'
  const enemy_id = 'enemy-id'
  const cell_id = 'origin-cell'
  const origin = {
    x: 1,
    y: 2 
  }
  const destination = {
    x: 4,
    y: 5 
  }

  let levels: Record<string, Partial<Record<TechnologyCode, number>>>
  let factions: Record<string, FactionCode>
  let getMovementCapacity: MockInstance
  let listAllInCell: MockInstance
  let movementCreate: MockInstance
  let scheduleTroopMovementFinish: MockInstance
  let emit: MockInstance

  beforeEach(() => {
    levels = { [player_id]: { [TechnologyCode.ESPIONAGE]: 1 } }
    factions = {
      [player_id]: FactionCode.THE_CONFEDERATION,
      [enemy_id]: FactionCode.THE_ASH_LITURGY,
    }

    vi.spyOn(AppService, 'getTacticalPropulsionLevel').mockResolvedValue(0)
    vi.spyOn(AppService, 'getTechnologyLevels').mockImplementation(async ({
      player_id: requested, codes 
    }) => Object.fromEntries(codes.map(code => [
      code,
      levels[requested]?.[code] ?? 0 
    ])) as never)
    getMovementCapacity = vi.spyOn(AppService, 'getMovementCapacity').mockResolvedValue({
      used: 0,
      limit: 5
    })

    listAllInCell = vi.fn().mockResolvedValue([
      TroopEntity.create({
        id: 'enemy-stack',
        player_id: enemy_id,
        cell_id: 'destination-cell',
        code: TroopCode.PENITENT_HORDE,
        count: 3,
        movement_id: null,
      }),
    ])
    movementCreate = vi.fn().mockResolvedValue(undefined)
    scheduleTroopMovementFinish = vi.fn().mockResolvedValue('job-id')
    emit = vi.fn()

    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      cell: {
        getCell: vi.fn().mockResolvedValue(CellEntity.create({
          id: cell_id,
          coordinates: origin,
          type: CellType.FOREST,
          resource_coefficient: {
            plastic: 0.1,
            mushroom: 0.1,
            plasma: 0
          },
          solar_coefficient: 1
        })),
      },
      troop: {
        listInCell: vi.fn().mockResolvedValue([
          TroopEntity.create({
            id: 'explorers',
            code: TroopCode.EXPLORER,
            count: 10,
            player_id,
            cell_id,
            movement_id: null
          }),
          TroopEntity.create({
            id: 'legionnaires',
            code: TroopCode.LEGIONNAIRE,
            count: 5,
            player_id,
            cell_id,
            movement_id: null,
          }),
        ]),
        listAllInCell,
        create: vi.fn().mockResolvedValue(undefined),
        updateOne: vi.fn().mockResolvedValue(undefined),
      },
      player: { get: vi.fn().mockImplementation(async (requested: string) => ({ faction_code: factions[requested] })) },
      city: { searchByCell: vi.fn().mockResolvedValue(null) },
      outpost: { searchByCell: vi.fn().mockResolvedValue(null) },
      movement: { create: movementCreate },
    } as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ scheduleTroopMovementFinish } as unknown as JobQueue)
    vi.spyOn(Factory, 'getEventBus').mockReturnValue({ emit } as never)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const spy = (move_troops: { code: TroopCode; count: number }[] = [
    {
      code: TroopCode.EXPLORER,
      count: 2
    }
  ]) => createTroopMovement({
    player_id,
    origin,
    destination,
    action: MovementAction.SPY,
    move_troops,
  })

  const attack = () => createTroopMovement({
    player_id,
    origin,
    destination,
    action: MovementAction.ATTACK,
    combat_strategy: CombatStrategy.BALANCED,
    move_troops: [
      {
        code: TroopCode.LEGIONNAIRE,
        count: 2
      }
    ],
  })

  describe('spy movement', () => {
    it('creates a spy movement with scouts on an enemy stack', async () => {
      await spy()

      const movement = movementCreate.mock.calls[0][0]
      assert.strictEqual(movement.action, MovementAction.SPY)
      assert.strictEqual(movement.combat_strategy, null)
      assert.strictEqual(scheduleTroopMovementFinish.mock.calls.length, 1)
    })

    it('requires espionage', async () => {
      levels[player_id] = {}
      await assert.rejects(() => spy(), new RegExp(IntelError.ESPIONAGE_REQUIRED))
      assert.strictEqual(movementCreate.mock.calls.length, 0)
    })

    it('rejects non-scout troops', async () => {
      await assert.rejects(() => spy([
        {
          code: TroopCode.EXPLORER,
          count: 1
        },
        {
          code: TroopCode.LEGIONNAIRE,
          count: 1
        },
      ]), new RegExp(IntelError.SCOUT_ONLY))
      assert.strictEqual(movementCreate.mock.calls.length, 0)
    })

    it('rejects a same-faction target', async () => {
      factions[enemy_id] = FactionCode.THE_CONFEDERATION
      await assert.rejects(() => spy(), new RegExp(CombatError.SAME_FACTION_ATTACK))
      assert.strictEqual(movementCreate.mock.calls.length, 0)
    })

    it('rejects a cell with nothing to spy on', async () => {
      listAllInCell.mockResolvedValue([])
      await assert.rejects(() => spy(), new RegExp(IntelError.NO_VALID_TARGET))
      assert.strictEqual(movementCreate.mock.calls.length, 0)
    })

    it('rejects when the player is at the movement limit', async () => {
      getMovementCapacity.mockResolvedValue({
        used: 5,
        limit: 5
      })
      await assert.rejects(() => spy(), new RegExp(TroopError.MOVEMENT_LIMIT_REACHED))
      assert.strictEqual(movementCreate.mock.calls.length, 0)
    })
  })

  describe('incoming attack notification', () => {
    it('warns the defender once they have detection', async () => {
      levels[enemy_id] = { [TechnologyCode.DETECTION]: 1 }

      await attack()

      const movement = movementCreate.mock.calls[0][0]
      const scheduled = scheduleTroopMovementFinish.mock.calls[0][0]
      expect(emit).toHaveBeenCalledWith(AppEvent.MovementIncoming, {
        player_id: enemy_id,
        movement_id: movement.id,
        arrive_at: scheduled.execute_at,
      })
    })

    it('sends nothing at detection 0', async () => {
      await attack()

      assert.strictEqual(movementCreate.mock.calls.length, 1)
      expect(emit).not.toHaveBeenCalledWith(AppEvent.MovementIncoming, expect.anything())
    })

    it('never warns about spy movements', async () => {
      levels[enemy_id] = { [TechnologyCode.DETECTION]: 5 }

      await spy()

      expect(emit).not.toHaveBeenCalledWith(AppEvent.MovementIncoming, expect.anything())
    })
  })
})

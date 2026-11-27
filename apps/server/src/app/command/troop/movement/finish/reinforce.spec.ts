import type { MockInstance } from 'vitest'
import { finishTroopReinforceMovement } from '#app/command/troop/movement/finish/reinforce'
import { Factory } from '#adapter/factory'
import { AppService } from '#app/service'
import { JobQueue } from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import { AllianceRole } from '#core/alliance/constant/role'
import { CityEntity } from '#core/city/entity'
import { ReportEntity } from '#core/communication/report/entity'
import { ReportType } from '#core/communication/value/report-type'
import { TroopCode } from '#core/troop/constant/code'
import { MovementAction } from '#core/troop/constant/movement-action'
import { TroopEntity } from '#core/troop/entity'
import { MovementEntity } from '#core/troop/movement/entity'
import { CellEntity } from '#core/world/cell/entity'
import { CellType } from '#core/world/value/cell-type'

describe('finishTroopReinforceMovement (slice 033)', () => {
  const owner_id = 'owner'
  const host_id = 'host'
  const origin = {
    x: 1,
    y: 1 
  }
  const destination = {
    x: 5,
    y: 5 
  }
  const movement = MovementEntity.create({
    id: 'reinforce-movement',
    player_id: owner_id,
    action: MovementAction.REINFORCE,
    origin,
    destination,
  })
  const host_cell = CellEntity.create({
    id: 'host-cell',
    coordinates: destination,
    type: CellType.FOREST,
    resource_coefficient: {
      plastic: 1,
      mushroom: 1,
      plasma: 0
    },
    solar_coefficient: 1,
  })
  const host_city = CityEntity.create({
    id: 'host-city',
    player_id: host_id,
    name: 'Bastion',
    cell_id: host_cell.id,
  })
  const moving = (id: string, code: TroopCode, count: number) => TroopEntity.create({
    id,
    player_id: owner_id,
    cell_id: null,
    code,
    count,
    movement_id: movement.id,
  })

  let memberships: Record<string, string>
  let troopUpdateOne: MockInstance
  let troopDelete: MockInstance
  let movementCreate: MockInstance
  let movementDelete: MockInstance
  let createReinforcementReport: MockInstance
  let listInCell: MockInstance

  beforeEach(() => {
    memberships = {
      [owner_id]: 'a1',
      [host_id]: 'a1'
    }
    troopUpdateOne = vi.fn().mockResolvedValue(undefined)
    troopDelete = vi.fn().mockResolvedValue(undefined)
    movementCreate = vi.fn().mockResolvedValue(undefined)
    movementDelete = vi.fn().mockResolvedValue(undefined)
    createReinforcementReport = vi.fn().mockResolvedValue(undefined)
    // A first reinforcement of legionnaires is already stationed for the owner; the host's own stack is never read.
    listInCell = vi.fn().mockResolvedValue([
      TroopEntity.create({
        id: 'owner-stationed',
        player_id: owner_id,
        cell_id: host_cell.id,
        code: TroopCode.LEGIONNAIRE,
        count: 2,
        movement_id: null,
      }),
    ])

    vi.spyOn(AppService, 'getTacticalPropulsionLevel').mockResolvedValue(0)
    vi.spyOn(AppService, 'getLogisticsModifier').mockResolvedValue({
      transport_capacity: 1,
      non_combat_speed: 1
    })
    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      movement: {
        getById: vi.fn().mockResolvedValue(movement),
        create: movementCreate,
        delete: movementDelete,
      },
      cell: { getCell: vi.fn().mockResolvedValue(host_cell) },
      city: { searchByCell: vi.fn().mockResolvedValue(host_city) },
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
        listByMovement: vi.fn().mockResolvedValue([
          moving('moving-legion', TroopCode.LEGIONNAIRE, 3),
          moving('moving-interceptor', TroopCode.INTERCEPTOR, 4),
        ]),
        listInCell,
        updateOne: troopUpdateOne,
        delete: troopDelete,
      },
      report: { createReinforcementReport },
    } as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ scheduleTroopMovementFinish: vi.fn().mockResolvedValue('job') } as unknown as JobQueue)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('stations the troops on the host cell with the owner player_id and notifies the host with a report', async () => {
    const result = await finishTroopReinforceMovement({
      player_id: owner_id,
      movement_id: movement.id,
      arrived_at: 1000,
    })

    expect(listInCell).toHaveBeenCalledWith({
      cell_id: host_cell.id,
      player_id: owner_id
    })
    const stationed = troopUpdateOne.mock.calls.map(call => call[0] as TroopEntity)
    expect(stationed.map(troop => ({
      id: troop.id,
      player_id: troop.player_id,
      cell_id: troop.cell_id,
      movement_id: troop.movement_id,
      code: troop.code,
      count: troop.count,
    }))).toEqual([
      {
        id: 'owner-stationed',
        player_id: owner_id,
        cell_id: host_cell.id,
        movement_id: null,
        code: TroopCode.LEGIONNAIRE,
        count: 5
      },
      {
        id: 'moving-interceptor',
        player_id: owner_id,
        cell_id: host_cell.id,
        movement_id: null,
        code: TroopCode.INTERCEPTOR,
        count: 4
      },
    ])
    // The merged legionnaire stack replaces the moving one.
    expect(troopDelete).toHaveBeenCalledWith('moving-legion')
    expect(troopDelete).not.toHaveBeenCalledWith('moving-interceptor')
    expect(movementDelete).toHaveBeenCalledWith(movement.id)

    const {
      report, owner_player_id 
    } = createReinforcementReport.mock.calls[0][0] as { report: ReportEntity, owner_player_id: string }
    expect(owner_player_id).toBe(owner_id)
    expect(report).toMatchObject({
      type: ReportType.REINFORCEMENT,
      player_id: host_id,
      troops: [
        {
          code: TroopCode.LEGIONNAIRE,
          count: 3 
        },
        {
          code: TroopCode.INTERCEPTOR,
          count: 4 
        },
      ],
    })
    expect(result).toEqual({
      outcome: 'stationed',
      host_player_id: host_id,
      city_id: host_city.id,
      report_id: report.id,
    })
  })

  it('sends the troops home without a cap check when the city is no longer allied', async () => {
    const capacity = vi.spyOn(AppService, 'assertMovementCapacity')
    delete memberships[host_id]

    const result = await finishTroopReinforceMovement({
      player_id: owner_id,
      movement_id: movement.id,
      arrived_at: 1000,
    })

    expect(result.outcome).toBe('returned')
    const base = movementCreate.mock.calls[0][0] as MovementEntity
    expect(base).toMatchObject({
      player_id: owner_id,
      action: MovementAction.BASE,
      origin: destination,
      destination: origin,
      // A reinforcement turned back is a trip home (« Retours », slice 045).
      is_return: true,
    })
    expect(createReinforcementReport).not.toHaveBeenCalled()
    expect(capacity).not.toHaveBeenCalled()
  })
})

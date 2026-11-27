import type { MockInstance } from 'vitest'
import { rebaseTroopMovement } from '#app/command/troop/movement/rebase'
import { Factory } from '#adapter/factory'
import { AppService } from '#app/service'
import { JobQueue } from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import { ReportType } from '#core/communication/value/report-type'
import { TroopCode } from '#core/troop/constant/code'
import { MovementAction } from '#core/troop/constant/movement-action'
import { TroopEntity } from '#core/troop/entity'
import { TroopError } from '#core/troop/error'
import { MovementEntity } from '#core/troop/movement/entity'
import { id } from '#shared/identification'
import { now } from '#shared/time'
import assert from 'assert'

describe('rebaseTroopMovement', () => {
  const player_id = id()
  const other_player_id = id()
  const arrived_at = now()

  let initial_base_movement: MovementEntity
  let initial_movement_troops: TroopEntity[]
  let movementDelete: MockInstance
  let movementCreate: MockInstance
  let troopUpdateOne: MockInstance
  let reportCreate: MockInstance
  let scheduleTroopMovementFinish: MockInstance
  let repository: Pick<Repository, 'troop' | 'movement' | 'report'>
  let getMovementCapacity: MockInstance

  beforeEach(() => {
    vi.spyOn(AppService, 'getTacticalPropulsionLevel').mockResolvedValue(0)
    vi.spyOn(AppService, 'getLogisticsModifier').mockResolvedValue({
      transport_capacity: 1,
      non_combat_speed: 1
    })
    getMovementCapacity = vi.spyOn(AppService, 'getMovementCapacity').mockResolvedValue({
      used: 1,
      limit: 5
    })
    initial_base_movement = MovementEntity.create({
      id: id(),
      action: MovementAction.BASE,
      player_id,
      origin: {
        x: 1,
        y: 2 },
      destination: {
        x: 4,
        y: 5 } })
    initial_movement_troops = [
      TroopEntity.create({
        id: id(),
        code: TroopCode.EXPLORER,
        count: 1,
        player_id,
        cell_id: null,
        movement_id: initial_base_movement.id
      }) ]

    movementDelete = vi.fn().mockResolvedValue(undefined)
    movementCreate = vi.fn().mockResolvedValue(undefined)
    troopUpdateOne = vi.fn().mockResolvedValue(undefined)
    reportCreate = vi.fn().mockResolvedValue(undefined)
    scheduleTroopMovementFinish = vi.fn().mockResolvedValue('job-id')

    repository = {
      troop: {
        listByMovement: vi.fn().mockResolvedValue(initial_movement_troops),
        updateOne: troopUpdateOne } as unknown as Repository['troop'],
      movement: {
        getById: vi.fn().mockResolvedValue(initial_base_movement),
        delete: movementDelete,
        create: movementCreate } as unknown as Repository['movement'],
      report: { create: reportCreate } as unknown as Repository['report'] }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ scheduleTroopMovementFinish } as unknown as JobQueue)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should prevent player from rebasing another player troops', async () => {
    repository.movement.getById = vi.fn().mockResolvedValue(MovementEntity.create({
      ...initial_base_movement,
      player_id: other_player_id }))

    await assert.rejects(
      () => rebaseTroopMovement({
        player_id,
        movement_id: initial_base_movement.id,
        arrived_at }),
      new RegExp(TroopError.MOVEMENT_NOT_OWNER)
    )
  })

  it('should rebase at the movement limit since the return trip replaces the inbound movement', async () => {
    getMovementCapacity.mockResolvedValue({
      used: 5,
      limit: 5
    })

    await rebaseTroopMovement({
      player_id,
      movement_id: initial_base_movement.id,
      arrived_at
    })

    assert.strictEqual(movementCreate.mock.calls.length, 1)
    assert.strictEqual(movementDelete.mock.calls[0][0], initial_base_movement.id)
  })

  it('should reject the rebase when the player is over the movement limit', async () => {
    getMovementCapacity.mockResolvedValue({
      used: 6,
      limit: 5
    })

    await assert.rejects(
      () => rebaseTroopMovement({
        player_id,
        movement_id: initial_base_movement.id,
        arrived_at
      }),
      new RegExp(TroopError.MOVEMENT_LIMIT_REACHED)
    )
    assert.strictEqual(movementCreate.mock.calls.length, 0)
    assert.strictEqual(movementDelete.mock.calls.length, 0)
  })

  it('should remove old movement', async () => {
    await rebaseTroopMovement({
      player_id,
      movement_id: initial_base_movement.id,
      arrived_at })

    assert.strictEqual(movementDelete.mock.calls[0][0], initial_base_movement.id)
  })

  it('should create a new movement with same troops and reversed trip', async () => {
    await rebaseTroopMovement({
      player_id,
      movement_id: initial_base_movement.id,
      arrived_at })

    const movement_to_create = movementCreate.mock.calls[0][0]
    assert.deepStrictEqual(movement_to_create.origin, initial_base_movement.destination)
    assert.deepStrictEqual(movement_to_create.destination, initial_base_movement.origin)

    const troops_to_update = troopUpdateOne.mock.calls.map(([ t ]) => t)
    troops_to_update.forEach(troop_to_update => {
      const initial_troop = initial_movement_troops.find(troop => troop.code === troop_to_update.code)

      assert.ok(initial_troop)
      assert.strictEqual(troop_to_update.id, initial_troop.id)
      assert.strictEqual(troop_to_update.count, initial_troop.count)
      assert.strictEqual(troop_to_update.movement_id, movement_to_create.id)
    })

    assert.strictEqual(scheduleTroopMovementFinish.mock.calls.length, 1)
    const scheduled = scheduleTroopMovementFinish.mock.calls[0][0]
    assert.strictEqual(scheduled.movement_id, movement_to_create.id)
    assert.ok(scheduled.execute_at > arrived_at)
  })

  it('should use the owner tactical_propulsion level for the return trip', async () => {
    const combat_troops = [
      TroopEntity.create({
        id: id(),
        code: TroopCode.LEGIONNAIRE,
        count: 4,
        player_id,
        cell_id: null,
        movement_id: initial_base_movement.id
      })
    ]
    repository.troop.listByMovement = vi.fn().mockResolvedValue(combat_troops)

    await rebaseTroopMovement({
      player_id,
      movement_id: initial_base_movement.id,
      arrived_at
    })
    const base_execute_at = scheduleTroopMovementFinish.mock.calls[0][0].execute_at

    vi.spyOn(AppService, 'getTacticalPropulsionLevel').mockResolvedValue(10)
    await rebaseTroopMovement({
      player_id,
      movement_id: initial_base_movement.id,
      arrived_at
    })
    const boosted_execute_at = scheduleTroopMovementFinish.mock.calls[1][0].execute_at

    expect(AppService.getTacticalPropulsionLevel).toHaveBeenCalledWith({ player_id })
    assert.ok(boosted_execute_at < base_execute_at)
  })

  it('should give a return trip without combat units the owner logistics speed bonus (slice 039)', async () => {
    await rebaseTroopMovement({
      player_id,
      movement_id: initial_base_movement.id,
      arrived_at
    })
    const base_execute_at = scheduleTroopMovementFinish.mock.calls[0][0].execute_at

    vi.spyOn(AppService, 'getLogisticsModifier').mockResolvedValue({
      transport_capacity: 1.1,
      non_combat_speed: 1.05
    })
    await rebaseTroopMovement({
      player_id,
      movement_id: initial_base_movement.id,
      arrived_at
    })
    const boosted_execute_at = scheduleTroopMovementFinish.mock.calls[1][0].execute_at

    expect(AppService.getLogisticsModifier).toHaveBeenCalledWith({ player_id })
    assert.ok(boosted_execute_at < base_execute_at)

    // With a combat unit the bonus does not apply.
    repository.troop.listByMovement = vi.fn().mockResolvedValue([
      TroopEntity.create({
        id: id(),
        code: TroopCode.LEGIONNAIRE,
        count: 1,
        player_id,
        cell_id: null,
        movement_id: initial_base_movement.id
      })
    ])
    await rebaseTroopMovement({
      player_id,
      movement_id: initial_base_movement.id,
      arrived_at
    })
    vi.spyOn(AppService, 'getLogisticsModifier').mockResolvedValue({
      transport_capacity: 1,
      non_combat_speed: 1
    })
    await rebaseTroopMovement({
      player_id,
      movement_id: initial_base_movement.id,
      arrived_at
    })
    assert.strictEqual(
      scheduleTroopMovementFinish.mock.calls[2][0].execute_at,
      scheduleTroopMovementFinish.mock.calls[3][0].execute_at
    )
  })

  it('should create a report indicating that a rebase was needed', async () => {
    await rebaseTroopMovement({
      player_id,
      movement_id: initial_base_movement.id,
      arrived_at })

    const report = reportCreate.mock.calls[0][0]
    assert.strictEqual(report.type, ReportType.REBASE)
    assert.strictEqual(report.player_id, player_id)
    assert.strictEqual(report.was_read, false)

    assert.strictEqual(report.recorded_at, arrived_at)
    assert.deepStrictEqual(report.origin, initial_base_movement.origin)
    assert.deepStrictEqual(report.destination, initial_base_movement.destination)

    initial_movement_troops.forEach(movement_troop => {
      const report_troop = report.troops.find((t: { code: TroopCode }) => t.code === movement_troop.code)
      assert.ok(report_troop)
      assert.strictEqual(report_troop.code, movement_troop.code)
      assert.strictEqual(report_troop.count, movement_troop.count)
    })
  })
})

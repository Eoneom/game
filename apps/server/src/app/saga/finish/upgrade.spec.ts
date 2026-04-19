import {
  vi, type MockInstance
} from 'vitest'
import assert from 'assert'
import { sagaFinishUpgrade } from './upgrade'
import { finishBuildingUpgrade } from '#app/command/building/finish-upgrade'
import { cityGather } from '#app/command/city/gather'
import { BuildingCode } from '#core/building/constant/code'

vi.mock('#app/command/building/finish-upgrade')
vi.mock('#app/command/city/gather')

describe('sagaFinishUpgrade', () => {
  const player_id = 'player_id'
  const city_id = 'city_id'
  const building_id = 'building_id'
  const level = 0
  const upgraded_at = 1000

  beforeEach(() => {
    vi.clearAllMocks()
    ;(finishBuildingUpgrade as MockInstance).mockResolvedValue(null)
    ;(cityGather as MockInstance).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls finishBuildingUpgrade with correct args', async () => {
    await sagaFinishUpgrade({
      player_id,
      city_id,
      building_id,
      level,
      upgraded_at
    })

    assert.strictEqual((finishBuildingUpgrade as MockInstance).mock.calls.length, 1)
    assert.deepStrictEqual((finishBuildingUpgrade as MockInstance).mock.calls[0][0], {
      player_id,
      city_id,
      building_id,
      level,
      upgraded_at
    })
  })

  it('does not call cityGather when there is no upgrade in progress', async () => {
    (finishBuildingUpgrade as MockInstance).mockResolvedValue(null)

    await sagaFinishUpgrade({
      player_id,
      city_id,
      building_id,
      level,
      upgraded_at
    })

    assert.strictEqual((cityGather as MockInstance).mock.calls.length, 0)
  })

  it('calls cityGather with upgraded_at when upgrade result is a production building', async () => {
    (finishBuildingUpgrade as MockInstance).mockResolvedValue({
      code: BuildingCode.MUSHROOM_FARM,
      upgraded_at
    })

    await sagaFinishUpgrade({
      player_id,
      city_id,
      building_id,
      level,
      upgraded_at
    })

    assert.strictEqual((cityGather as MockInstance).mock.calls.length, 1)
    assert.deepStrictEqual((cityGather as MockInstance).mock.calls[0][0], {
      player_id,
      city_id,
      gather_at_time: upgraded_at
    })
  })

  it('calls cityGather with upgraded_at when upgrade result is a warehouse building', async () => {
    (finishBuildingUpgrade as MockInstance).mockResolvedValue({
      code: BuildingCode.MUSHROOM_WAREHOUSE,
      upgraded_at
    })

    await sagaFinishUpgrade({
      player_id,
      city_id,
      building_id,
      level,
      upgraded_at
    })

    assert.strictEqual((cityGather as MockInstance).mock.calls.length, 1)
    assert.deepStrictEqual((cityGather as MockInstance).mock.calls[0][0], {
      player_id,
      city_id,
      gather_at_time: upgraded_at
    })
  })

  it('does not call cityGather when upgrade result is a non-production/warehouse building', async () => {
    (finishBuildingUpgrade as MockInstance).mockResolvedValue({
      code: BuildingCode.RESEARCH_LAB,
      upgraded_at
    })

    await sagaFinishUpgrade({
      player_id,
      city_id,
      building_id,
      level,
      upgraded_at
    })

    assert.strictEqual((cityGather as MockInstance).mock.calls.length, 0)
  })
})

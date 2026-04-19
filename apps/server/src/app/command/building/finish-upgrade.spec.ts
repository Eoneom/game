import type { MockInstance } from 'vitest'
import { finishBuildingUpgrade } from '#app/command/building/finish-upgrade'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { BuildingCode } from '#core/building/constant/code'
import { BuildingEntity } from '#core/building/entity'
import { CityEntity } from '#core/city/entity'
import { CityError } from '#core/city/error'
import { AppEvent } from '#core/events'
import { AppEventBus } from '#app/event-bus'
import assert from 'assert'
import { id } from '#shared/identification'

describe('finishBuildingUpgrade', () => {
  const player_id = id()
  const other_player_id = id()
  const upgraded_at = 1_700_000_000_000
  let city: CityEntity
  let building_to_finish: BuildingEntity
  let buildingUpdateOne: MockInstance
  let emit: MockInstance
  let repository: Pick<Repository, 'building' | 'city'>

  beforeEach(() => {
    city = CityEntity.initCity({
      name: 'dummy',
      player_id
    })
    building_to_finish = BuildingEntity.create({
      id: id(),
      level: 0,
      code: BuildingCode.MUSHROOM_FARM,
      city_id: city.id
    })

    buildingUpdateOne = vi.fn().mockResolvedValue(undefined)
    emit = vi.fn()

    repository = {
      building: {
        getById: vi.fn().mockResolvedValue(building_to_finish),
        updateOne: buildingUpdateOne
      } as unknown as Repository['building'],
      city: { get: vi.fn().mockResolvedValue(city) } as unknown as Repository['city']
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(Factory, 'getEventBus').mockReturnValue({ emit } as unknown as AppEventBus)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should prevent a player to upgrade building in another player city', async () => {
    await assert.rejects(
      () => finishBuildingUpgrade({
        city_id: city.id,
        player_id: other_player_id,
        building_id: building_to_finish.id,
        level: 0,
        upgraded_at
      }),
      new RegExp(CityError.NOT_OWNER)
    )
  })

  it('should not update when building level does not match the job', async () => {
    const result = await finishBuildingUpgrade({
      city_id: city.id,
      player_id,
      building_id: building_to_finish.id,
      level: 1,
      upgraded_at
    })

    assert.ok(result === null)
    assert.strictEqual(buildingUpdateOne.mock.calls.length, 0)
  })

  it('should finish the building upgrade', async () => {
    const result = await finishBuildingUpgrade({
      city_id: city.id,
      player_id,
      building_id: building_to_finish.id,
      level: 0,
      upgraded_at
    })

    const updated_building = buildingUpdateOne.mock.calls[0][0]
    assert.ok(updated_building)
    assert.strictEqual(updated_building.level, 1)
    assert.ok(result)
    assert.strictEqual(result?.code, BuildingCode.MUSHROOM_FARM)
    assert.strictEqual(result?.upgraded_at, upgraded_at)
    assert.deepStrictEqual(emit.mock.calls[0], [
      AppEvent.BuildingUpgradeFinished,
      {
        city_id: city.id,
        player_id
      }
    ])
  })
})

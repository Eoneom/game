import type { MockInstance } from 'vitest'
import { finishBuildingUpgrade } from '#app/command/building/finish-upgrade'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { BuildingCode } from '#core/building/constant/code'
import { BuildingEntity } from '#core/building/entity'
import { CityEntity } from '#core/city/entity'
import { CityError } from '#core/city/error'
import { now } from '#shared/time'
import assert from 'assert'
import { id } from '#shared/identification'

describe('finishBuildingUpgrade', () => {
  const player_id = id()
  const other_player_id = id()
  let city: CityEntity
  let building_to_finish: BuildingEntity
  let buildingUpdateOne: MockInstance
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
      city_id: city.id,
      upgrade_at: now()
    })

    buildingUpdateOne = vi.fn().mockResolvedValue(undefined)

    repository = {
      building: {
        getUpgradeDone: vi.fn().mockResolvedValue(building_to_finish),
        updateOne: buildingUpdateOne
      } as unknown as Repository['building'],
      city: { get: vi.fn().mockResolvedValue(city) } as unknown as Repository['city']
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should prevent a player to upgrade building in another player city', async () => {
    await assert.rejects(
      () => finishBuildingUpgrade({
        city_id: city.id,
        player_id: other_player_id
      }),
      new RegExp(CityError.NOT_OWNER)
    )
  })

  it('should not return any update if there is no building in progress', async () => {
    repository.building.getUpgradeDone = vi.fn().mockResolvedValue(null)

    const result = await finishBuildingUpgrade({
      city_id: city.id,
      player_id
    })

    assert.ok(result === null)
    assert.strictEqual(buildingUpdateOne.mock.calls.length, 0)
  })

  it('should finish the building upgrade', async () => {
    const result = await finishBuildingUpgrade({
      city_id: city.id,
      player_id
    })

    const updated_building = buildingUpdateOne.mock.calls[0][0]
    assert.ok(building_to_finish.upgrade_at)
    assert.ok(updated_building)
    assert.ok(!updated_building.upgrade_at)
    assert.ok(result)
    assert.strictEqual(result?.code, BuildingCode.MUSHROOM_FARM)
    assert.strictEqual(result?.upgraded_at, building_to_finish.upgrade_at)
  })
})

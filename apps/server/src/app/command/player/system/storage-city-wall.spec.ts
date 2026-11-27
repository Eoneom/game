import assert from 'assert'
import { BuildingCode } from '#core/building/constant/code'
import {
  isSystemCityWallAllowed,
  shouldSystemUpgradeCityWall,
  sortBuildingsForSystemUpgrade,
} from './storage'

const buildings = (cloning_factory: number, city_wall: number) => [
  {
    code: BuildingCode.CLONING_FACTORY,
    level: cloning_factory 
  },
  {
    code: BuildingCode.CITY_WALL,
    level: city_wall 
  },
  {
    code: BuildingCode.RECYCLING_PLANT,
    level: 10 
  },
  {
    code: BuildingCode.MUSHROOM_FARM,
    level: 10 
  },
]

describe('system Enceinte policy (slice 029)', () => {
  it('waits for cloning_factory 4', () => {
    assert.strictEqual(isSystemCityWallAllowed(buildings(3, 0)), false)
    assert.strictEqual(isSystemCityWallAllowed(buildings(4, 0)), true)
  })

  it('upgrades the capital first, other cities up to the capital level', () => {
    assert.strictEqual(shouldSystemUpgradeCityWall({
      buildings: buildings(4, 2),
      is_capital: true,
      capital_city_wall_level: 0 
    }), true)
    assert.strictEqual(shouldSystemUpgradeCityWall({
      buildings: buildings(4, 0),
      is_capital: false,
      capital_city_wall_level: 0 
    }), false)
    assert.strictEqual(shouldSystemUpgradeCityWall({
      buildings: buildings(4, 0),
      is_capital: false,
      capital_city_wall_level: 1 
    }), true)
    assert.strictEqual(shouldSystemUpgradeCityWall({
      buildings: buildings(4, 1),
      is_capital: false,
      capital_city_wall_level: 1 
    }), false)
    assert.strictEqual(shouldSystemUpgradeCityWall({
      buildings: buildings(3, 0),
      is_capital: true,
      capital_city_wall_level: 0 
    }), false)
  })

  it('ranks the Enceinte low, and last before cloning_factory 4', () => {
    const resource_stock = {
      plastic: 0,
      mushroom: 0,
      plasma: 0 
    }
    const warehouses_capacity = {
      plastic: 100_000,
      mushroom: 100_000 
    }
    const before = sortBuildingsForSystemUpgrade({
      buildings: buildings(3, 0),
      resource_stock,
      warehouses_capacity,
    })
    assert.strictEqual(before[before.length - 1].code, BuildingCode.CITY_WALL)

    const after = sortBuildingsForSystemUpgrade({
      buildings: buildings(4, 0),
      resource_stock,
      warehouses_capacity,
    })
    assert.ok(after.findIndex(b => b.code === BuildingCode.CITY_WALL) > after.findIndex(b => b.code === BuildingCode.CLONING_FACTORY))
  })
})

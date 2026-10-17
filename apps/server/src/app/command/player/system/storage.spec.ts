import assert from 'assert'
import {
  isCityWarehouseUnderPressure,
  resourcesForTransportToDestination,
  sortBuildingsForSystemUpgrade,
  SYSTEM_WAREHOUSE_PRESSURE_FILL_RATIO
} from './storage'
import { BuildingCode } from '#core/building/constant/code'

describe('system player storage policy', () => {
  it('uses the same fill ratio as the web warehouse warn threshold', () => {
    assert.strictEqual(SYSTEM_WAREHOUSE_PRESSURE_FILL_RATIO, 0.7)
  })

  it('detects pressure when plastic or mushroom is at least 70% full', () => {
    assert.strictEqual(isCityWarehouseUnderPressure({
      resource_stock: {
        plastic: 70,
        mushroom: 0,
        plasma: 0
      },
      warehouses_capacity: {
        plastic: 100,
        mushroom: 1000
      }
    }), true)
    assert.strictEqual(isCityWarehouseUnderPressure({
      resource_stock: {
        plastic: 10,
        mushroom: 700,
        plasma: 0
      },
      warehouses_capacity: {
        plastic: 1000,
        mushroom: 1000
      }
    }), true)
    assert.strictEqual(isCityWarehouseUnderPressure({
      resource_stock: {
        plastic: 69,
        mushroom: 699,
        plasma: 0
      },
      warehouses_capacity: {
        plastic: 100,
        mushroom: 1000
      }
    }), false)
  })

  it('bootstraps core production before a pressured warehouse when levels are still 0', () => {
    const sorted = sortBuildingsForSystemUpgrade({
      buildings: [
        {
          id: 'farm',
          code: BuildingCode.MUSHROOM_FARM,
          level: 0
        },
        {
          id: 'plant',
          code: BuildingCode.RECYCLING_PLANT,
          level: 0
        },
        {
          id: 'plastic',
          code: BuildingCode.PLASTIC_WAREHOUSE,
          level: 0
        },
      ],
      resource_stock: {
        plastic: 3500,
        mushroom: 0,
        plasma: 0
      },
      warehouses_capacity: {
        plastic: 4000,
        mushroom: 3000
      }
    })

    assert.strictEqual(sorted[0].code, BuildingCode.MUSHROOM_FARM)
  })

  it('prefers the pressured warehouse over production once core production exists', () => {
    const sorted = sortBuildingsForSystemUpgrade({
      buildings: [
        {
          id: 'farm',
          code: BuildingCode.MUSHROOM_FARM,
          level: 1
        },
        {
          id: 'plant',
          code: BuildingCode.RECYCLING_PLANT,
          level: 1
        },
        {
          id: 'plastic',
          code: BuildingCode.PLASTIC_WAREHOUSE,
          level: 0
        },
      ],
      resource_stock: {
        plastic: 3500,
        mushroom: 0,
        plasma: 0
      },
      warehouses_capacity: {
        plastic: 4000,
        mushroom: 3000
      }
    })

    assert.strictEqual(sorted[0].code, BuildingCode.PLASTIC_WAREHOUSE)
  })

  it('prefers a full warehouse even while bootstrapping production', () => {
    const sorted = sortBuildingsForSystemUpgrade({
      buildings: [
        {
          id: 'farm',
          code: BuildingCode.MUSHROOM_FARM,
          level: 0
        },
        {
          id: 'plant',
          code: BuildingCode.RECYCLING_PLANT,
          level: 0
        },
        {
          id: 'plastic',
          code: BuildingCode.PLASTIC_WAREHOUSE,
          level: 0
        },
      ],
      resource_stock: {
        plastic: 4000,
        mushroom: 0,
        plasma: 0
      },
      warehouses_capacity: {
        plastic: 4000,
        mushroom: 3000
      }
    })

    assert.strictEqual(sorted[0].code, BuildingCode.PLASTIC_WAREHOUSE)
  })

  it('prefers solar panel over production when production energy ratio is below 1', () => {
    const sorted = sortBuildingsForSystemUpgrade({
      buildings: [
        {
          id: 'farm',
          code: BuildingCode.MUSHROOM_FARM,
          level: 0
        },
        {
          id: 'solar',
          code: BuildingCode.SOLAR_PANEL,
          level: 0
        },
      ],
      resource_stock: {
        plastic: 10,
        mushroom: 10,
        plasma: 0
      },
      warehouses_capacity: {
        plastic: 4000,
        mushroom: 3000
      },
      production_energy_ratio: 0,
    })

    assert.strictEqual(sorted[0].code, BuildingCode.SOLAR_PANEL)
  })

  it('prefers the lower-level production building to keep plastic and mushroom in sync', () => {
    const sorted = sortBuildingsForSystemUpgrade({
      buildings: [
        {
          id: 'plant',
          code: BuildingCode.RECYCLING_PLANT,
          level: 4
        },
        {
          id: 'farm',
          code: BuildingCode.MUSHROOM_FARM,
          level: 1
        },
      ],
      resource_stock: {
        plastic: 10,
        mushroom: 10,
        plasma: 0
      },
      warehouses_capacity: {
        plastic: 4000,
        mushroom: 3000
      },
      production_energy_ratio: 1,
    })

    assert.strictEqual(sorted[0].code, BuildingCode.MUSHROOM_FARM)
    assert.strictEqual(sorted[1].code, BuildingCode.RECYCLING_PLANT)
  })

  it('bootstraps production before warehouses when storage is not pressured', () => {
    const sorted = sortBuildingsForSystemUpgrade({
      buildings: [
        {
          id: 'farm',
          code: BuildingCode.MUSHROOM_FARM,
          level: 0
        },
        {
          id: 'plant',
          code: BuildingCode.RECYCLING_PLANT,
          level: 0
        },
        {
          id: 'plastic',
          code: BuildingCode.PLASTIC_WAREHOUSE,
          level: 0
        },
      ],
      resource_stock: {
        plastic: 50,
        mushroom: 10,
        plasma: 0
      },
      warehouses_capacity: {
        plastic: 4000,
        mushroom: 3000
      },
    })

    assert.strictEqual(sorted[0].code, BuildingCode.MUSHROOM_FARM)
  })

  it('still prefers warehouses over production when storage is not pressured and core production exists', () => {
    const sorted = sortBuildingsForSystemUpgrade({
      buildings: [
        {
          id: 'farm',
          code: BuildingCode.MUSHROOM_FARM,
          level: 2
        },
        {
          id: 'plant',
          code: BuildingCode.RECYCLING_PLANT,
          level: 2
        },
        {
          id: 'plastic',
          code: BuildingCode.PLASTIC_WAREHOUSE,
          level: 0
        },
      ],
      resource_stock: {
        plastic: 10,
        mushroom: 10,
        plasma: 0
      },
      warehouses_capacity: {
        plastic: 4000,
        mushroom: 3000
      },
    })

    assert.strictEqual(sorted[0].code, BuildingCode.PLASTIC_WAREHOUSE)
  })

  it('clamps transported plastic and mushroom to destination free space', () => {
    assert.deepStrictEqual(resourcesForTransportToDestination({
      origin_stock: {
        plastic: 500,
        mushroom: 800,
        plasma: 3
      },
      destination_space_remaining: {
        plastic: 100,
        mushroom: 200
      }
    }), {
      plastic: 100,
      mushroom: 200,
      plasma: 3
    })
  })
})

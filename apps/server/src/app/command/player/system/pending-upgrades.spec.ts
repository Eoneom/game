import assert from 'assert'
import { BuildingCode } from '#core/building/constant/code'
import { TechnologyCode } from '#core/technology/constant/code'
import {
  hasPendingBuildingUpgrade,
  hasPendingTechnologyResearchByCode,
  projectBuildingLevelsForPolicy,
  projectTechnologyLevelsForPolicy,
  projectWarehousesCapacity,
} from './pending-upgrades'

describe('system player pending upgrades', () => {
  it('counts an active upgrade and queued items for the same building code', () => {
    assert.strictEqual(hasPendingBuildingUpgrade({
      building_code: BuildingCode.PLASTIC_WAREHOUSE,
      buildings: [
        {
          id: 'plastic',
          code: BuildingCode.PLASTIC_WAREHOUSE,
          level: 1,
          upgrade_at: 1000,
          upgrade_started_at: 0,
        },
        {
          id: 'farm',
          code: BuildingCode.MUSHROOM_FARM,
          level: 1,
        },
      ],
      upgrade_queue: [
        {
          id: 'queue-1',
          building_code: BuildingCode.MUSHROOM_FARM,
        },
      ],
    }), true)
    assert.strictEqual(hasPendingBuildingUpgrade({
      building_code: BuildingCode.MUSHROOM_WAREHOUSE,
      buildings: [
        {
          id: 'plastic',
          code: BuildingCode.PLASTIC_WAREHOUSE,
          level: 1,
          upgrade_at: 1000,
          upgrade_started_at: 0,
        },
      ],
      upgrade_queue: [],
    }), false)
  })

  it('projects warehouse capacity from pending upgrades', () => {
    const capacity = projectWarehousesCapacity({
      buildings: [
        {
          id: 'plastic',
          code: BuildingCode.PLASTIC_WAREHOUSE,
          level: 0,
          upgrade_at: 1000,
          upgrade_started_at: 0,
        },
        {
          id: 'mushroom',
          code: BuildingCode.MUSHROOM_WAREHOUSE,
          level: 0,
        },
      ],
      upgrade_queue: [],
    })

    assert.strictEqual(capacity.plastic, 8000)
    assert.strictEqual(capacity.mushroom, 3000)
  })

  it('projects building levels for policy checks', () => {
    const projected = projectBuildingLevelsForPolicy({
      buildings: [
        {
          id: 'plant',
          code: BuildingCode.RECYCLING_PLANT,
          level: 2,
        },
      ],
      upgrade_queue: [
        {
          id: 'queue-1',
          building_code: BuildingCode.RECYCLING_PLANT,
        },
      ],
    })

    assert.strictEqual(projected[0].level, 3)
  })

  it('projects technology levels from active research and queued items', () => {
    const projected = projectTechnologyLevelsForPolicy({
      technologies: [
        {
          id: 'arch',
          code: TechnologyCode.ARCHITECTURE,
          level: 1,
          research_at: 1000,
          research_started_at: 0,
        },
      ],
      research_queue: [
        {
          id: 'queue-1',
          technology_code: TechnologyCode.ARCHITECTURE,
          city_id: 'city-1',
          city_name: 'Lab',
        },
      ],
    })

    assert.strictEqual(projected[0].level, 3)
    assert.strictEqual(hasPendingTechnologyResearchByCode({
      technology_code: TechnologyCode.ARCHITECTURE,
      technologies: [
        {
          id: 'arch',
          code: TechnologyCode.ARCHITECTURE,
          level: 1,
          research_at: 1000,
          research_started_at: 0,
        },
      ],
      research_queue: [
        {
          id: 'queue-1',
          technology_code: TechnologyCode.ARCHITECTURE,
          city_id: 'city-1',
          city_name: 'Lab',
        },
      ],
    }), true)
  })
})

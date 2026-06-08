import assert from 'assert'
import { BuildingCode } from '#core/building/constant/code'
import { BuildingService } from '#core/building/service'

describe('BuildingService.getEnergy', () => {
  it('returns 0 at level 0', () => {
    assert.strictEqual(BuildingService.getEnergy({ level: 0 }), 0)
  })

  it('returns base value at level 1', () => {
    assert.strictEqual(BuildingService.getEnergy({ level: 1 }), 10)
  })

  it('returns exponential value at level 2', () => {
    assert.strictEqual(BuildingService.getEnergy({ level: 2 }), 15)
  })

  it('returns coefficient-scaled energy at level 1', () => {
    assert.strictEqual(BuildingService.getEnergy({
      level: 1,
      coefficient: 1.5
    }), 15)
  })

  it('returns 0 at level 0 regardless of coefficient', () => {
    assert.strictEqual(BuildingService.getEnergy({
      level: 0,
      coefficient: 1.5
    }), 0)
  })

  it('applies efficiency level bonus at level 1', () => {
    assert.strictEqual(BuildingService.getEnergy({
      level: 1,
      coefficient: 1,
      efficiency_level: 1
    }), 12)
  })

  it('applies efficiency level bonus at level 2', () => {
    assert.strictEqual(BuildingService.getEnergy({
      level: 2,
      coefficient: 1,
      efficiency_level: 2
    }), 20)
  })
})

describe('BuildingService.getEnergyConsumption', () => {
  it('returns 0 at level 0', () => {
    assert.strictEqual(BuildingService.getEnergyConsumption({
      code: BuildingCode.RECYCLING_PLANT,
      level: 0
    }), 0)
  })

  it('returns base value at level 1 for recycling plant', () => {
    assert.strictEqual(BuildingService.getEnergyConsumption({
      code: BuildingCode.RECYCLING_PLANT,
      level: 1
    }), 20)
  })

  it('returns exponential value at level 2 for mushroom farm', () => {
    assert.strictEqual(BuildingService.getEnergyConsumption({
      code: BuildingCode.MUSHROOM_FARM,
      level: 2
    }), 24)
  })

  it('returns higher consumption for research lab', () => {
    assert.strictEqual(BuildingService.getEnergyConsumption({
      code: BuildingCode.RESEARCH_LAB,
      level: 1
    }), 60)
  })

  it('returns highest consumption for cloning factory', () => {
    assert.strictEqual(BuildingService.getEnergyConsumption({
      code: BuildingCode.CLONING_FACTORY,
      level: 1
    }), 100)
  })

  it('returns high consumption for central inductor', () => {
    assert.strictEqual(BuildingService.getEnergyConsumption({
      code: BuildingCode.CENTRAL_INDUCTOR,
      level: 1
    }), 180)
  })
})

describe('BuildingService.getEarningsBySecond', () => {
  it('returns low plasma earnings for central inductor at level 1', () => {
    assert.strictEqual(BuildingService.getEarningsBySecond({
      code: BuildingCode.CENTRAL_INDUCTOR,
      level: 1,
      coefficients: { plastic: 1, mushroom: 1, plasma: 1 }
    }), 0.05)
  })

  it('ignores cell coefficients for central inductor', () => {
    assert.strictEqual(BuildingService.getEarningsBySecond({
      code: BuildingCode.CENTRAL_INDUCTOR,
      level: 1,
      coefficients: { plastic: 9, mushroom: 9, plasma: 9 }
    }), 0.05)
  })
})

describe('BuildingService.getProductionEnergyRatio', () => {
  it('returns 1 when production consumption is 0', () => {
    assert.strictEqual(BuildingService.getProductionEnergyRatio({
      supply: 10,
      non_production_consumption: 6,
      production_consumption: 0
    }), 1)
  })

  it('returns 1 when supply covers all consumption', () => {
    assert.strictEqual(BuildingService.getProductionEnergyRatio({
      supply: 10,
      non_production_consumption: 6,
      production_consumption: 4
    }), 1)
  })

  it('returns proportional ratio when partially starved', () => {
    assert.strictEqual(BuildingService.getProductionEnergyRatio({
      supply: 10,
      non_production_consumption: 6,
      production_consumption: 8
    }), 0.5)
  })

  it('returns 0 when non-production consumption exceeds supply', () => {
    assert.strictEqual(BuildingService.getProductionEnergyRatio({
      supply: 10,
      non_production_consumption: 16,
      production_consumption: 4
    }), 0)
  })
})

describe('BuildingService.wouldUpgradeExceedEnergySupply', () => {
  it('returns false when projected total stays within supply', () => {
    assert.strictEqual(BuildingService.wouldUpgradeExceedEnergySupply({
      supply: 10,
      total_consumption: 8,
      current_building_consumption: 2,
      next_building_consumption: 3
    }), false)
  })

  it('returns true when projected total exceeds supply', () => {
    assert.strictEqual(BuildingService.wouldUpgradeExceedEnergySupply({
      supply: 10,
      total_consumption: 9,
      current_building_consumption: 2,
      next_building_consumption: 4
    }), true)
  })
})

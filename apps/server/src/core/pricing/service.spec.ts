import assert from 'assert'
import { BuildingCode } from '#core/building/constant/code'
import {
  ARCHITECTURE_REDUCTION_PER_LEVEL,
  building_costs
} from '#core/pricing/constant/building'
import {
  RESEARCH_LABEL_REDUCTION_PER_LEVEL,
  technology_costs
} from '#core/pricing/constant/technology'
import {
  CLONING_FACTORY_REDUCTION_PER_LEVEL,
  REPLICATION_CATALYST_REDUCTION_PER_LEVEL,
  troop_costs
} from '#core/pricing/constant/troop'
import { PricingService } from '#core/pricing/service'
import { TechnologyCode } from '#core/technology/constant/code'
import { TroopCode } from '#core/troop/constant/code'
import { DefenseCode } from '#core/defense/constant/code'
import { scaleGameDurationSeconds } from '#shared/game-time-scale'

function reductionFrom(reduction_percent_per_level: number, level: number): number {
  return Math.pow(1 - 1 / reduction_percent_per_level, level)
}

describe('PricingService', () => {
  describe('getTroopCost', () => {
    it('returns scaled resources and duration with no reductions', () => {
      const code = TroopCode.EXPLORER
      const count = 2
      const cost = troop_costs[code]
      const reduced = Math.ceil(cost.duration *
          count *
          reductionFrom(CLONING_FACTORY_REDUCTION_PER_LEVEL, 0) *
          reductionFrom(REPLICATION_CATALYST_REDUCTION_PER_LEVEL, 0))

      const result = PricingService.getTroopCost({
        code,
        count,
        cloning_factory_level: 0,
        replication_catalyst_level: 0
      })

      assert.strictEqual(result.code, code)
      assert.strictEqual(result.resource.plastic, cost.plastic * count)
      assert.strictEqual(result.resource.mushroom, cost.mushroom * count)
      assert.strictEqual(result.duration, scaleGameDurationSeconds(reduced))
    })

    it('applies multiplicative cloning factory and replication catalyst reductions', () => {
      const code = TroopCode.EXPLORER
      const count = 2
      const cost = troop_costs[code]
      const cloning_factory_level = 1
      const replication_catalyst_level = 1
      const reduced = Math.ceil(cost.duration *
          count *
          reductionFrom(
            CLONING_FACTORY_REDUCTION_PER_LEVEL,
            cloning_factory_level
          ) *
          reductionFrom(
            REPLICATION_CATALYST_REDUCTION_PER_LEVEL,
            replication_catalyst_level
          ))

      const result = PricingService.getTroopCost({
        code,
        count,
        cloning_factory_level,
        replication_catalyst_level
      })

      assert.strictEqual(result.duration, scaleGameDurationSeconds(reduced))
    })
  })

  describe('getBuildingLevelCost', () => {
    it('returns level-1 resources and scaled duration with no architecture bonus', () => {
      const code = BuildingCode.RECYCLING_PLANT
      const level = 1
      const {
        plastic, mushroom, duration 
      } = building_costs[code]
      const arch = reductionFrom(ARCHITECTURE_REDUCTION_PER_LEVEL, 0)
      const baseDur = duration.base * Math.pow(duration.multiplier, level - 1)
      const rawSeconds = Math.ceil(baseDur * arch)

      const result = PricingService.getBuildingLevelCost({
        code,
        level,
        architecture_level: 0
      })

      assert.strictEqual(result.code, code)
      assert.strictEqual(result.level, level)
      assert.strictEqual(
        result.resource.plastic,
        Math.ceil(plastic.base * Math.pow(plastic.multiplier, level - 1))
      )
      assert.strictEqual(
        result.resource.mushroom,
        Math.ceil(mushroom.base * Math.pow(mushroom.multiplier, level - 1))
      )
      assert.strictEqual(result.duration, scaleGameDurationSeconds(rawSeconds))
    })

    it('shortens duration with architecture level without changing resources', () => {
      const code = BuildingCode.PLASTIC_WAREHOUSE
      const level = 2
      const { duration } = building_costs[code]
      const baseDur = duration.base * Math.pow(duration.multiplier, level - 1)
      const rawNoArch = Math.ceil(baseDur * reductionFrom(ARCHITECTURE_REDUCTION_PER_LEVEL, 0))
      const rawWithArch = Math.ceil(baseDur * reductionFrom(ARCHITECTURE_REDUCTION_PER_LEVEL, 1))

      const without = PricingService.getBuildingLevelCost({
        code,
        level,
        architecture_level: 0
      })
      const withArch = PricingService.getBuildingLevelCost({
        code,
        level,
        architecture_level: 1
      })

      assert.strictEqual(without.resource.plastic, withArch.resource.plastic)
      assert.strictEqual(without.resource.mushroom, withArch.resource.mushroom)
      assert.strictEqual(without.duration, scaleGameDurationSeconds(rawNoArch))
      assert.strictEqual(withArch.duration, scaleGameDurationSeconds(rawWithArch))
      assert.ok(withArch.duration <= without.duration)
    })
  })

  describe('getTechnologyLevelCost', () => {
    it('returns level cost with no research lab reduction', () => {
      const code = TechnologyCode.ARCHITECTURE
      const level = 1
      const {
        plastic, mushroom, duration 
      } = technology_costs[code]
      const lab = reductionFrom(RESEARCH_LABEL_REDUCTION_PER_LEVEL, 0)
      const baseDur = duration.base * Math.pow(duration.multiplier, level - 1)
      const rawSeconds = Math.ceil(baseDur * lab)

      const result = PricingService.getTechnologyLevelCost({
        code,
        level,
        research_lab_level: 0
      })

      assert.strictEqual(result.code, code)
      assert.strictEqual(result.level, level)
      assert.strictEqual(
        result.resource.plastic,
        Math.ceil(plastic.base * Math.pow(plastic.multiplier, level - 1))
      )
      assert.strictEqual(
        result.resource.mushroom,
        Math.ceil(mushroom.base * Math.pow(mushroom.multiplier, level - 1))
      )
      assert.strictEqual(result.duration, scaleGameDurationSeconds(rawSeconds))
    })

    it('shortens duration with research lab level', () => {
      const code = TechnologyCode.ARCHITECTURE
      const level = 1
      const { duration } = technology_costs[code]
      const baseDur = duration.base * Math.pow(duration.multiplier, level - 1)
      const raw0 = Math.ceil(baseDur * reductionFrom(RESEARCH_LABEL_REDUCTION_PER_LEVEL, 0))
      const raw1 = Math.ceil(baseDur * reductionFrom(RESEARCH_LABEL_REDUCTION_PER_LEVEL, 1))

      const a = PricingService.getTechnologyLevelCost({
        code,
        level,
        research_lab_level: 0
      })
      const b = PricingService.getTechnologyLevelCost({
        code,
        level,
        research_lab_level: 1
      })

      assert.strictEqual(a.duration, scaleGameDurationSeconds(raw0))
      assert.strictEqual(b.duration, scaleGameDurationSeconds(raw1))
      assert.ok(b.duration <= a.duration)
    })
  })

  describe('getTechnologyResearchRefund', () => {
    it('returns half of research cost resources rounded', () => {
      const code = TechnologyCode.ARCHITECTURE
      const level = 2
      const research_lab_level = 1
      const costs = PricingService.getTechnologyLevelCost({
        code,
        level,
        research_lab_level
      })
      const refund = PricingService.getTechnologyResearchRefund({
        code,
        level,
        research_lab_level
      })

      assert.strictEqual(
        refund.plastic,
        Math.round(costs.resource.plastic / 2)
      )
      assert.strictEqual(
        refund.mushroom,
        Math.round(costs.resource.mushroom / 2)
      )
    })
  })

  describe('getBuildingUpgradeRefund', () => {
    it('returns half of upgrade cost resources rounded', () => {
      const code = BuildingCode.MUSHROOM_FARM
      const level = 2
      const costs = PricingService.getBuildingLevelCost({
        code,
        level,
        architecture_level: 0
      })
      const refund = PricingService.getBuildingUpgradeRefund({
        code,
        level 
      })

      assert.strictEqual(
        refund.plastic,
        Math.round(costs.resource.plastic / 2)
      )
      assert.strictEqual(
        refund.mushroom,
        Math.round(costs.resource.mushroom / 2)
      )
    })
  })
})

describe('PricingService plasma costs', () => {
  const building_code = BuildingCode.MUSHROOM_FARM
  const technology_code = TechnologyCode.ARCHITECTURE
  const troop_code = TroopCode.EXPLORER
  const plasma_curve = {
    base: 15,
    multiplier: 1.5
  }

  afterEach(() => {
    delete building_costs[building_code].plasma
    delete technology_costs[technology_code].plasma
    delete troop_costs[troop_code].plasma
  })

  it('returns 0 plasma when tables define no plasma cost', () => {
    assert.strictEqual(PricingService.getBuildingLevelCost({
      code: building_code,
      level: 3,
      architecture_level: 0
    }).resource.plasma, 0)
    assert.strictEqual(PricingService.getTechnologyLevelCost({
      code: technology_code,
      level: 3,
      research_lab_level: 0
    }).resource.plasma, 0)
    assert.strictEqual(PricingService.getTroopCost({
      code: troop_code,
      count: 4,
      cloning_factory_level: 0,
      replication_catalyst_level: 0
    }).resource.plasma, 0)
  })

  it('computes building plasma on the level curve, unaffected by architecture', () => {
    building_costs[building_code].plasma = plasma_curve

    const level = 3
    const expected = Math.ceil(plasma_curve.base * Math.pow(plasma_curve.multiplier, level - 1))
    const without = PricingService.getBuildingLevelCost({
      code: building_code,
      level,
      architecture_level: 0
    })
    const withArch = PricingService.getBuildingLevelCost({
      code: building_code,
      level,
      architecture_level: 5
    })

    assert.strictEqual(without.resource.plasma, expected)
    assert.strictEqual(withArch.resource.plasma, expected)
  })

  it('computes technology plasma on the level curve, unaffected by research lab', () => {
    technology_costs[technology_code].plasma = plasma_curve

    const level = 2
    const expected = Math.ceil(plasma_curve.base * Math.pow(plasma_curve.multiplier, level - 1))
    const without = PricingService.getTechnologyLevelCost({
      code: technology_code,
      level,
      research_lab_level: 0
    })
    const withLab = PricingService.getTechnologyLevelCost({
      code: technology_code,
      level,
      research_lab_level: 3
    })

    assert.strictEqual(without.resource.plasma, expected)
    assert.strictEqual(withLab.resource.plasma, expected)
  })

  it('multiplies troop plasma by count', () => {
    troop_costs[troop_code].plasma = 7

    const result = PricingService.getTroopCost({
      code: troop_code,
      count: 4,
      cloning_factory_level: 2,
      replication_catalyst_level: 1
    })

    assert.strictEqual(result.resource.plasma, 28)
  })

  it('refunds half of building plasma rounded', () => {
    building_costs[building_code].plasma = plasma_curve

    const level = 2
    const cost = PricingService.getBuildingLevelCost({
      code: building_code,
      level,
      architecture_level: 0
    })
    const refund = PricingService.getBuildingUpgradeRefund({
      code: building_code,
      level
    })

    assert.strictEqual(cost.resource.plasma, 23)
    assert.strictEqual(refund.plasma, 12)
  })

  it('refunds half of technology plasma rounded', () => {
    technology_costs[technology_code].plasma = plasma_curve

    const level = 2
    const cost = PricingService.getTechnologyLevelCost({
      code: technology_code,
      level,
      research_lab_level: 1
    })
    const refund = PricingService.getTechnologyResearchRefund({
      code: technology_code,
      level,
      research_lab_level: 1
    })

    assert.strictEqual(cost.resource.plasma, 23)
    assert.strictEqual(refund.plasma, 12)
  })
})

describe('PricingService military and economy technologies (slice 027)', () => {
  const arsenal = [
    {
      code: TechnologyCode.BALLISTIC_ALLOYS,
      plasma_base: 500
    },
    {
      code: TechnologyCode.ORGANIC_PLATING,
      plasma_base: 500
    },
    {
      code: TechnologyCode.TACTICAL_PROPULSION,
      plasma_base: 800
    },
  ]
  const economy = [
    TechnologyCode.ADVANCED_RECYCLING,
    TechnologyCode.AGRONOMY,
    TechnologyCode.STORAGE_COMPRESSION,
    TechnologyCode.PLASMA_CONTAINMENT,
  ]

  it('charges plasma for Arsenal from level 1', () => {
    for (const {
      code, plasma_base
    } of arsenal) {
      assert.strictEqual(PricingService.getTechnologyLevelCost({
        code,
        level: 1,
        research_lab_level: 0
      }).resource.plasma, plasma_base)
      const plasma = technology_costs[code].plasma
      assert.ok(plasma)
      assert.strictEqual(PricingService.getTechnologyLevelCost({
        code,
        level: 3,
        research_lab_level: 4
      }).resource.plasma, Math.ceil(plasma.base * Math.pow(plasma.multiplier, 2)))
    }
  })

  it('charges no plasma for Économie', () => {
    for (const code of economy) {
      const cost = PricingService.getTechnologyLevelCost({
        code,
        level: 4,
        research_lab_level: 0
      })
      assert.strictEqual(cost.resource.plasma, 0)
      assert.ok(cost.resource.plastic > 0)
      assert.ok(cost.resource.mushroom > 0)
    }
  })

  it('uses the spec level-1 plastic / mushroom / duration values', () => {
    const level_one = (code: TechnologyCode) => PricingService.getTechnologyLevelCost({
      code,
      level: 1,
      research_lab_level: 0
    })
    assert.deepStrictEqual(level_one(TechnologyCode.TACTICAL_PROPULSION).resource, {
      plastic: 10000,
      mushroom: 8000,
      plasma: 800,
      water: 0
    })
    assert.deepStrictEqual(level_one(TechnologyCode.STORAGE_COMPRESSION).resource, {
      plastic: 5000,
      mushroom: 5000,
      plasma: 0,
      water: 0
    })
    assert.strictEqual(
      level_one(TechnologyCode.PLASMA_CONTAINMENT).duration,
      scaleGameDurationSeconds(150)
    )
  })
})

describe('PricingService city defenses (slice 029)', () => {
  it('prices defenses per unit × count, plasma included', () => {
    const result = PricingService.getDefenseCost({
      code: DefenseCode.PLASMA_BATTERY,
      count: 3,
      city_wall_level: 0,
    })

    assert.deepStrictEqual(result.resource, {
      plastic: 4500,
      mushroom: 3000,
      plasma: 900,
      water: 0
    })
    assert.strictEqual(result.duration, scaleGameDurationSeconds(540))
  })

  it('has no plasma cost for ramparts, turrets and minefields', () => {
    for (const code of [
      DefenseCode.RAMPART,
      DefenseCode.TURRET,
      DefenseCode.MINEFIELD 
    ]) {
      assert.strictEqual(PricingService.getDefenseCost({
        code,
        count: 2,
        city_wall_level: 1 
      }).resource.plasma, 0)
    }
  })

  it('shortens the duration by (1 − 1/10)^level of the Enceinte', () => {
    const result = PricingService.getDefenseCost({
      code: DefenseCode.RAMPART,
      count: 10,
      city_wall_level: 2,
    })

    assert.strictEqual(result.duration, scaleGameDurationSeconds(Math.ceil(600 * Math.pow(0.9, 2))))
  })

  it('prices the Enceinte and Fortification per the spec', () => {
    const wall = PricingService.getBuildingLevelCost({
      code: BuildingCode.CITY_WALL,
      level: 1,
      architecture_level: 0,
    })
    assert.deepStrictEqual(wall.resource, {
      plastic: 1500,
      mushroom: 1000,
      plasma: 0,
      water: 0
    })
    assert.strictEqual(wall.duration, scaleGameDurationSeconds(150))

    const fortification = PricingService.getTechnologyLevelCost({
      code: TechnologyCode.FORTIFICATION,
      level: 2,
      research_lab_level: 0,
    })
    assert.deepStrictEqual(fortification.resource, {
      plastic: Math.ceil(7000 * 1.7),
      mushroom: Math.ceil(7000 * 1.7),
      plasma: Math.ceil(400 * 1.7),
      water: 0
    })
  })
  it('prices the Renseignement technologies without plasma (slice 030)', () => {
    for (const code of [
      TechnologyCode.ESPIONAGE,
      TechnologyCode.DETECTION 
    ]) {
      const first = PricingService.getTechnologyLevelCost({
        code,
        level: 1,
        research_lab_level: 0,
      })
      assert.deepStrictEqual(first.resource, {
        plastic: 3000,
        mushroom: 3000,
        plasma: 0,
        water: 0
      })
      assert.strictEqual(first.duration, scaleGameDurationSeconds(120))

      const second = PricingService.getTechnologyLevelCost({
        code,
        level: 2,
        research_lab_level: 0,
      })
      assert.deepStrictEqual(second.resource, {
        plastic: Math.ceil(3000 * 1.7),
        mushroom: Math.ceil(3000 * 1.7),
        plasma: 0,
        water: 0
      })
    }
  })
})

describe('PricingService water buildings (slice 035)', () => {
  it('prices the water purifier at plastic 2500 / mushroom 2000 / 200 s, ×1.7 per level, without water', () => {
    const first = PricingService.getBuildingLevelCost({
      code: BuildingCode.WATER_PURIFIER,
      level: 1,
      architecture_level: 0,
    })
    assert.deepStrictEqual(first.resource, {
      plastic: 2500,
      mushroom: 2000,
      plasma: 0,
      water: 0
    })
    assert.strictEqual(first.duration, scaleGameDurationSeconds(200))

    const second = PricingService.getBuildingLevelCost({
      code: BuildingCode.WATER_PURIFIER,
      level: 2,
      architecture_level: 0,
    })
    assert.strictEqual(second.resource.plastic, Math.ceil(2500 * 1.7))
    assert.strictEqual(second.resource.mushroom, Math.ceil(2000 * 1.7))
  })

  it('prices the trading post at plastic 1500 / mushroom 1500 / 150 s, ×1.8 per level', () => {
    const first = PricingService.getBuildingLevelCost({
      code: BuildingCode.TRADING_POST,
      level: 1,
      architecture_level: 0,
    })
    assert.deepStrictEqual(first.resource, {
      plastic: 1500,
      mushroom: 1500,
      plasma: 0,
      water: 0
    })
    assert.strictEqual(first.duration, scaleGameDurationSeconds(150))
    assert.strictEqual(PricingService.getBuildingLevelCost({
      code: BuildingCode.TRADING_POST,
      level: 2,
      architecture_level: 0,
    }).resource.plastic, Math.ceil(1500 * 1.8))
  })
})

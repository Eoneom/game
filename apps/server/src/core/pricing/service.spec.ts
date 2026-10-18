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

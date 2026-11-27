import { BuildingCode } from '#core/building/constant/code'
import { DefenseCode } from '#core/defense/constant/code'
import { RankingService } from '#core/ranking/service'
import { RankingCategory } from '#core/ranking/value/category'
import { TechnologyCode } from '#core/technology/constant/code'
import { TroopCode } from '#core/troop/constant/code'

describe('RankingService', () => {
  it('weighs plasma five times plastic and mushroom', () => {
    expect(RankingService.resourceValue({
      plastic: 100,
      mushroom: 50,
      plasma: 10
    })).toBe(200)
  })

  it('converts value to points rounded down per 1000', () => {
    expect(RankingService.points(999)).toBe(0)
    expect(RankingService.points(1000)).toBe(1)
    expect(RankingService.points(25_999)).toBe(25)
  })

  it('sums every building level from 1 to L, free starting levels included', () => {
    // Recycling plant: level 1 = 100 + 50, level 2 = 155 + 70, level 3 = ceil(240.25) + ceil(98).
    expect(RankingService.buildingValue({
      code: BuildingCode.RECYCLING_PLANT,
      level: 1
    })).toBe(150)
    expect(RankingService.buildingValue({
      code: BuildingCode.RECYCLING_PLANT,
      level: 3
    })).toBe(150 + 225 + 339)
    expect(RankingService.buildingValue({
      code: BuildingCode.RECYCLING_PLANT,
      level: 0
    })).toBe(0)
  })

  it('counts the Enceinte like any building', () => {
    expect(RankingService.buildingValue({
      code: BuildingCode.CITY_WALL,
      level: 2
    })).toBe(2500 + 4250)
  })

  it('sums every technology level from 1 to L', () => {
    expect(RankingService.technologyValue({
      code: TechnologyCode.ARCHITECTURE,
      level: 2
    })).toBe(4000 + 8000)
  })

  it('values troops and defenses at count × unit cost, plasma weighted', () => {
    expect(RankingService.troopValue({
      code: TroopCode.LEGIONNAIRE,
      count: 3
    })).toBe(3 * 2500)
    // Plasma battery: 1500 + 1000 + 5 × 300.
    expect(RankingService.defenseValue({
      code: DefenseCode.PLASMA_BATTERY,
      count: 2
    })).toBe(2 * 4000)
    expect(RankingService.troopValue({
      code: TroopCode.LEGIONNAIRE,
      count: 0
    })).toBe(0)
  })

  it('splits global and economy scores and reads military from the counter', () => {
    const scores = RankingService.scores({
      buildings: [
        {
          code: BuildingCode.CITY_WALL,
          level: 2
        } 
      ],
      technologies: [
        {
          code: TechnologyCode.ARCHITECTURE,
          level: 2
        } 
      ],
      troops: [
        {
          code: TroopCode.LEGIONNAIRE,
          count: 4
        } 
      ],
      defenses: [
        {
          code: DefenseCode.PLASMA_BATTERY,
          count: 1
        } 
      ],
      military_value: 12_345,
    })

    const economy = 6750 + 12_000
    expect(scores).toEqual({
      [RankingCategory.ECONOMY]: Math.floor(economy / 1000),
      [RankingCategory.GLOBAL]: Math.floor((economy + 10_000 + 4000) / 1000),
      [RankingCategory.MILITARY]: 12,
    })
  })
})

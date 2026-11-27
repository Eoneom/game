import assert from 'assert'
import { BuildingCode } from '#core/building/constant/code'
import { RequirementService } from '#core/requirement/service'
import { TechnologyCode } from '#core/technology/constant/code'

describe('RequirementService water buildings (slice 035)', () => {
  it('requires architecture 3 for the water purifier', () => {
    assert.deepStrictEqual(RequirementService.getBuildingRequirement({ building_code: BuildingCode.WATER_PURIFIER }), {
      buildings: [],
      technologies: [
        {
          code: TechnologyCode.ARCHITECTURE,
          level: 3
        }
      ]
    })
  })

  it('requires architecture 2 for the trading post', () => {
    assert.deepStrictEqual(RequirementService.getBuildingRequirement({ building_code: BuildingCode.TRADING_POST }), {
      buildings: [],
      technologies: [
        {
          code: TechnologyCode.ARCHITECTURE,
          level: 2
        }
      ]
    })
  })
})

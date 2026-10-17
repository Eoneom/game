import {
  levelsForSystemRequirementGate,
  meetsBuildingUpgradeRequirement,
  meetsTechnologyResearchRequirement,
} from './requirements'
import { BuildingCode } from '#core/building/constant/code'
import { TechnologyCode } from '#core/technology/constant/code'
import assert from 'assert'

describe('system player requirement gate', () => {
  it('uses current levels when starting an action (matches human commands)', () => {
    const levels = levelsForSystemRequirementGate({
      use_projected_levels: false,
      buildings: [
        {
          code: BuildingCode.RESEARCH_LAB,
          level: 1,
        },
      ],
      technologies: [
        {
          code: TechnologyCode.ARCHITECTURE,
          level: 4,
        },
      ],
      research_queue: [
        {
          id: 'q1',
          technology_code: TechnologyCode.ARCHITECTURE,
        },
      ],
    })

    assert.strictEqual(
      meetsBuildingUpgradeRequirement({
        building_code: BuildingCode.CENTRAL_INDUCTOR,
        levels,
      }),
      false
    )
  })

  it('uses projected technology levels when enqueueing behind in-flight research', () => {
    const levels = levelsForSystemRequirementGate({
      use_projected_levels: true,
      buildings: [
        {
          code: BuildingCode.RESEARCH_LAB,
          level: 5,
        },
      ],
      technologies: [
        {
          code: TechnologyCode.ARCHITECTURE,
          level: 4,
        },
      ],
      research_queue: [
        {
          id: 'q1',
          technology_code: TechnologyCode.ARCHITECTURE,
        },
      ],
    })

    assert.strictEqual(
      meetsBuildingUpgradeRequirement({
        building_code: BuildingCode.CENTRAL_INDUCTOR,
        levels,
      }),
      true
    )
  })

  it('applies research-lab offset from the technology level passed in', () => {
    const levels = levelsForSystemRequirementGate({
      use_projected_levels: false,
      buildings: [
        {
          code: BuildingCode.RESEARCH_LAB,
          level: 2,
        },
      ],
      technologies: [
        {
          code: TechnologyCode.ARCHITECTURE,
          level: 1,
        },
      ],
    })

    assert.strictEqual(
      meetsTechnologyResearchRequirement({
        technology_code: TechnologyCode.ARCHITECTURE,
        technology_level: 1,
        levels,
      }),
      true
    )
    assert.strictEqual(
      meetsTechnologyResearchRequirement({
        technology_code: TechnologyCode.ARCHITECTURE,
        technology_level: 2,
        levels,
      }),
      false
    )
  })
})

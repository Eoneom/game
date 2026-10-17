import assert from 'assert'
import { CellEntity } from '#core/world/cell/entity'
import { CellType } from '#core/world/value/cell-type'
import {
  shouldDeferExploreForBasing,
  sortCellsByExpansionScore,
  systemExpansionCitySiteScore,
  systemExpansionOutpostResourceScore,
  systemExpansionScoutScore,
  systemTickExpansionCategories,
} from './expansion-cell'

function testCell({
  x,
  y,
  plastic,
  mushroom,
  solar,
}: {
  x: number
  y: number
  plastic: number
  mushroom: number
  solar: number
}): CellEntity {
  return CellEntity.create({
    id: `cell-${x}-${y}`,
    coordinates: {
      x,
      y,
    },
    type: CellType.LAKE,
    resource_coefficient: {
      plastic,
      mushroom,
      plasma: 1,
    },
    solar_coefficient: solar,
  })
}

describe('system expansion cell scoring', () => {
  it('ranks higher scout scores first with coordinate tie-break', () => {
    const weak = testCell({
      x: 1,
      y: 1,
      plastic: 1,
      mushroom: 1,
      solar: 1,
    })
    const strong = testCell({
      x: 2,
      y: 2,
      plastic: 1.5,
      mushroom: 1.5,
      solar: 1.8,
    })

    const sorted = sortCellsByExpansionScore({
      cells: [ weak, strong ],
      score: systemExpansionScoutScore,
    })

    assert.strictEqual(sorted[0], strong)
  })

  it('separates city site and outpost resource scores', () => {
    const solar_rich = testCell({
      x: 1,
      y: 1,
      plastic: 1,
      mushroom: 1,
      solar: 2.5,
    })
    const resource_rich = testCell({
      x: 2,
      y: 2,
      plastic: 2,
      mushroom: 2,
      solar: 1,
    })

    assert.ok(systemExpansionCitySiteScore(solar_rich) > systemExpansionCitySiteScore(resource_rich))
    assert.ok(systemExpansionOutpostResourceScore(resource_rich) > systemExpansionOutpostResourceScore(solar_rich))
  })

  it('defers explore when a good base site beats marginal fog', () => {
    assert.strictEqual(
      shouldDeferExploreForBasing({
        best_base_score: 2.5,
        best_unexplored_scout_score: 3.25,
        can_found_city: true,
      }),
      true,
    )
    assert.strictEqual(
      shouldDeferExploreForBasing({
        best_base_score: 1,
        best_unexplored_scout_score: 4,
        can_found_city: true,
      }),
      false,
    )
    assert.strictEqual(
      shouldDeferExploreForBasing({
        best_base_score: 3,
        best_unexplored_scout_score: 2,
        can_found_city: true,
      }),
      true,
    )
  })

  it('uses base-first expansion categories while outpost count is low', () => {
    assert.deepStrictEqual(systemTickExpansionCategories({
      outpost_count: 0,
      city_count: 1,
      temporary_outpost_count: 0,
    }), [
      'base',
      'explore',
      'settle',
      'make-permanent',
    ])
    assert.deepStrictEqual(systemTickExpansionCategories({
      outpost_count: 2,
      city_count: 1,
      temporary_outpost_count: 0,
    }), [
      'base',
      'explore',
      'settle',
      'make-permanent',
    ])
    assert.deepStrictEqual(systemTickExpansionCategories({
      outpost_count: 5,
      city_count: 2,
      temporary_outpost_count: 0,
    }), [
      'explore',
      'base',
      'settle',
      'make-permanent',
    ])
  })

  it('uses commit-first expansion categories while temp outposts exist', () => {
    assert.deepStrictEqual(systemTickExpansionCategories({
      outpost_count: 3,
      city_count: 1,
      temporary_outpost_count: 2,
    }), [
      'settle',
      'make-permanent',
      'base',
      'explore',
    ])
  })
})

import assert from 'assert'
import { CellEntity } from '#core/world/cell/entity'
import { CellType } from '#core/world/value/cell-type'
import {
  sortCellsByExpansionScore,
  systemExpansionCitySiteScore,
  systemExpansionOutpostResourceScore,
  systemExpansionScoutScore,
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
})

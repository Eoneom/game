import {
  boundsNeedsFetch,
  cellsInBounds,
  countCachedCellsInBounds,
  countCellsInBounds,
  createCellCache,
  mergeCells,
  mergeSettlements,
} from '#map/cell-cache'
import { CellType, FactionCode } from '@eoneom/api-client'

const cell = (
  x: number,
  y: number,
  explored = false,
  withCoeffs = false,
) => ({
  coordinates: {
    x,
    y,
  },
  type: CellType.FOREST,
  explored,
  characteristic: withCoeffs
    ? {
      resource_coefficient: {
        plastic: 1,
        mushroom: 2,
      },
      solar_coefficient: 3,
    }
    : undefined,
})

describe('cell-cache', () => {
  it('mergeCells does not clear explored when a terrain-only batch arrives after full intel', () => {
    const cache = createCellCache()
    mergeCells(cache, [cell(1, 1, true, true)])
    mergeCells(cache, [cell(1, 1, false, false)])
    expect(cache.get('1,1')?.explored).toBe(true)
    expect(cache.get('1,1')?.characteristic?.solar_coefficient).toBe(3)
  })

  it('mergeCells keeps richer characteristics when terrain batch arrives first', () => {
    const cache = createCellCache()
    mergeCells(cache, [cell(1, 1)])
    mergeCells(cache, [cell(1, 1, true, true)])
    const merged = cache.get('1,1')
    expect(merged?.explored).toBe(true)
    expect(merged?.characteristic?.solar_coefficient).toBe(3)
  })

  it('countCachedCellsInBounds and boundsNeedsFetch detect cache holes', () => {
    const cache = createCellCache()
    const bounds = {
      min_x: 1,
      max_x: 2,
      min_y: 1,
      max_y: 2,
    }
    expect(countCellsInBounds(bounds)).toBe(4)
    expect(countCachedCellsInBounds(cache, bounds)).toBe(0)
    expect(boundsNeedsFetch(cache, bounds)).toBe(true)
    mergeCells(cache, [cell(1, 1)])
    expect(countCachedCellsInBounds(cache, bounds)).toBe(1)
    expect(boundsNeedsFetch(cache, bounds)).toBe(true)
    mergeCells(cache, [
      cell(2, 1),
      cell(1, 2),
      cell(2, 2),
    ])
    expect(boundsNeedsFetch(cache, bounds)).toBe(false)
  })

  it('cellsInBounds returns only cached cells inside bounds', () => {
    const cache = createCellCache()
    mergeCells(cache, [
      cell(1, 1),
      cell(2, 2),
    ])
    expect(
      cellsInBounds(cache, {
        min_x: 1,
        max_x: 1,
        min_y: 1,
        max_y: 2,
      }),
    ).toHaveLength(1)
  })

  it('mergeSettlements replaces markers in bounds', () => {
    const bounds = {
      min_x: 1,
      max_x: 5,
      min_y: 1,
      max_y: 5,
    }
    const merged = mergeSettlements(
      {
        cities: [
          {
            id: 'old',
            name: 'Old',
            player_id: 'p1',
            faction_code: FactionCode.THE_CONFEDERATION,
            coordinates: {
              x: 2,
              y: 2,
            },
          },
        ],
        outposts: [],
      },
      {
        cities: [
          {
            id: 'new',
            name: 'New',
            player_id: 'p2',
            faction_code: FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
            coordinates: {
              x: 3,
              y: 3,
            },
          },
        ],
        outposts: [],
      },
      bounds,
    )
    expect(merged.cities.map(c => c.id).sort()).toEqual([
      'new',
      'old',
    ])
  })
})

import { WorldGetCellsDataResponse } from '@eoneom/api-client'

import { ViewportBounds } from '#map/viewport'

export type WorldCell = WorldGetCellsDataResponse['cells'][number]

const cellKey = (coordinates: { x: number; y: number }): string =>
  `${coordinates.x},${coordinates.y}`

export type CellCache = Map<string, WorldCell>

export const createCellCache = (): CellCache => new Map()

export const mergeCells = (cache: CellCache, batch: WorldCell[]): void => {
  for (const cell of batch) {
    const key = cellKey(cell.coordinates)
    const existing = cache.get(key)
    if (!existing) {
      cache.set(key, cell)
      continue
    }
    cache.set(key, {
      ...existing,
      ...cell,
      characteristic: cell.characteristic ?? existing.characteristic,
    })
  }
}

export const countCellsInBounds = (bounds: ViewportBounds): number =>
  (bounds.max_x - bounds.min_x + 1) * (bounds.max_y - bounds.min_y + 1)

export const countCachedCellsInBounds = (
  cache: CellCache,
  bounds: ViewportBounds,
): number => {
  let count = 0
  for (let x = bounds.min_x; x <= bounds.max_x; x += 1) {
    for (let y = bounds.min_y; y <= bounds.max_y; y += 1) {
      if (cache.has(cellKey({ x, y }))) {
        count += 1
      }
    }
  }
  return count
}

export const boundsNeedsFetch = (
  cache: CellCache,
  bounds: ViewportBounds,
): boolean => countCachedCellsInBounds(cache, bounds) < countCellsInBounds(bounds)

export const cellsInBounds = (
  cache: CellCache,
  bounds: ViewportBounds,
): WorldCell[] => {
  const result: WorldCell[] = []
  for (let x = bounds.min_x; x <= bounds.max_x; x += 1) {
    for (let y = bounds.min_y; y <= bounds.max_y; y += 1) {
      const cell = cache.get(cellKey({ x, y }))
      if (cell) {
        result.push(cell)
      }
    }
  }
  return result
}

export const mergeSettlements = (
  previous: WorldGetCellsDataResponse['settlements'] | null,
  next: WorldGetCellsDataResponse['settlements'],
  bounds: ViewportBounds,
): WorldGetCellsDataResponse['settlements'] => {
  const inBounds = (coordinates: { x: number; y: number }) =>
    coordinates.x >= bounds.min_x &&
    coordinates.x <= bounds.max_x &&
    coordinates.y >= bounds.min_y &&
    coordinates.y <= bounds.max_y

  const citiesById = new Map(
    (previous?.cities ?? []).map(city => [city.id, city]),
  )
  for (const city of next.cities) {
    citiesById.set(city.id, city)
  }
  const outpostsById = new Map(
    (previous?.outposts ?? []).map(outpost => [outpost.id, outpost]),
  )
  for (const outpost of next.outposts) {
    outpostsById.set(outpost.id, outpost)
  }

  return {
    cities: [...citiesById.values()].filter(city => inBounds(city.coordinates)),
    outposts: [...outpostsById.values()].filter(outpost => inBounds(outpost.coordinates)),
  }
}

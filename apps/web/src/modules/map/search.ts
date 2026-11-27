import { WORLD_SIZE } from '@eoneom/api-client'

import { pickSearchValue } from '#helpers/search'
import { MAX_ZOOM_LEVEL, MIN_ZOOM_LEVEL, MapZoomLevel } from '#map/viewport'

/** « Bonus de terrain » metric: plastic, mushroom, or the mean of both. */
export const TERRAIN_METRICS = [ 'plastic', 'mushroom', 'mixed' ] as const
export type TerrainMetric = typeof TERRAIN_METRICS[number]

export interface MapLayers {
  movements: boolean
  /** Metric of the terrain bonus overlay, `null` when it is off. */
  terrain: TerrainMetric | null
  targets: boolean
}

/** Movements on, overlays off. */
export const DEFAULT_MAP_LAYERS: MapLayers = { movements: true, terrain: null, targets: false }

/** `?x=&y=&zoom=&layers=` of `…/world/map` (city and outpost routes). */
export interface MapSearch {
  x?: number
  y?: number
  zoom?: MapZoomLevel
  /** Comma list of `movements`, `terrain` (or `terrain:<metric>`), `targets`; absent = default, empty = none. */
  layers?: string
}

const toInteger = (value: unknown): number | undefined => {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN
  return Number.isInteger(parsed) ? parsed : undefined
}

const toCoordinate = (value: unknown): number | undefined => {
  const parsed = toInteger(value)
  return parsed !== undefined && parsed >= 1 && parsed <= WORLD_SIZE ? parsed : undefined
}

/** `movements,terrain:mushroom` → layers; unknown tokens are ignored, a list without any known token is the default. */
export const parseLayers = (value: string | undefined): MapLayers => {
  if (value === undefined) return DEFAULT_MAP_LAYERS
  const tokens = value.split(',').map(token => token.trim()).filter(Boolean)
  const layers: MapLayers = { movements: false, terrain: null, targets: false }
  let known = 0
  for (const token of tokens) {
    const [ name, metric ] = token.split(':')
    if (name === 'movements') {
      layers.movements = true
      known++
    } else if (name === 'targets') {
      layers.targets = true
      known++
    } else if (name === 'terrain') {
      layers.terrain = pickSearchValue(TERRAIN_METRICS, metric) ?? 'plastic'
      known++
    }
  }
  return tokens.length > 0 && known === 0 ? DEFAULT_MAP_LAYERS : layers
}

/** Inverse of `parseLayers`; the default is left out of the URL. `terrain` alone means plastic. */
export const serializeLayers = (layers: MapLayers): string | undefined => {
  if (layers.movements === DEFAULT_MAP_LAYERS.movements && layers.terrain === null && !layers.targets) return undefined
  return [
    layers.movements ? 'movements' : null,
    layers.terrain ? (layers.terrain === 'plastic' ? 'terrain' : `terrain:${layers.terrain}`) : null,
    layers.targets ? 'targets' : null,
  ].filter(Boolean).join(',')
}

/** Route `validateSearch`: invalid values are dropped; `x` and `y` are kept only together. */
export const validateMapSearch = (search: Record<string, unknown>): MapSearch => {
  const x = toCoordinate(search.x)
  const y = toCoordinate(search.y)
  const both = x !== undefined && y !== undefined
  const zoom = toInteger(search.zoom)
  const layers = typeof search.layers === 'string' ? serializeLayers(parseLayers(search.layers)) ?? undefined : undefined
  return {
    x: both ? x : undefined,
    y: both ? y : undefined,
    zoom: zoom !== undefined && zoom >= MIN_ZOOM_LEVEL && zoom <= MAX_ZOOM_LEVEL ? zoom as MapZoomLevel : undefined,
    layers: typeof search.layers === 'string' && search.layers.trim() === '' ? '' : layers,
  }
}

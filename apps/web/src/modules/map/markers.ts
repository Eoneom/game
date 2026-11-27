import { Coordinates, OutpostType, WorldMarkerCity, WorldMarkerOutpost, WorldMarkerRelation } from '@eoneom/api-client'

import { Point } from '#map/geometry'
import { MapWindow, isInBounds, worldToStage } from '#map/viewport'

/** City radius by size bucket, as a share of the cell edge (slice 044). */
const CITY_RADIUS_RATIO: Record<1 | 2 | 3 | 4, number> = { 1: 0.28, 2: 0.34, 3: 0.4, 4: 0.46 }
const MIN_CITY_RADIUS_PX = 5
const PERMANENT_OUTPOST_RATIO = 0.3
const TEMPORARY_OUTPOST_RATIO = 0.26
/** City and outpost on one cell: each moves this share of the cell away from the centre. */
const COLLOCATED_SHIFT = { x: 0.16, y: 0.1 }

export type ScreenMarker =
  | {
    kind: 'city'
    key: string
    marker: WorldMarkerCity
    relation: WorldMarkerRelation
    coordinates: Coordinates
    center: Point
    radius: number
    current: boolean
  }
  | {
    kind: 'outpost'
    key: string
    marker: WorldMarkerOutpost
    relation: WorldMarkerRelation
    coordinates: Coordinates
    center: Point
    radius: number
    hollow: boolean
    current: boolean
  }

const sameCell = (a: Coordinates, b: Coordinates | null | undefined): boolean => Boolean(b && a.x === b.x && a.y === b.y)

/** Stage geometry of the markers in the drawn range; the current location gets an extra ring. */
export const screenMarkers = ({
  cities,
  outposts,
  view,
  current,
}: {
  cities: WorldMarkerCity[]
  outposts: WorldMarkerOutpost[]
  view: MapWindow
  /** The route location: kind and id. */
  current: { kind: 'city' | 'outpost'; id: string } | null
}): ScreenMarker[] => {
  const cell = view.cellSize
  const visibleCities = cities.filter(city => isInBounds(city.coordinates, view.range))
  const visibleOutposts = outposts.filter(outpost => isInBounds(outpost.coordinates, view.range))
  const markers: ScreenMarker[] = []

  const centerOf = (coordinates: Coordinates, shift: number): Point => {
    const { px, py } = worldToStage(coordinates, view)
    return { x: px + shift * COLLOCATED_SHIFT.x * cell, y: py + shift * COLLOCATED_SHIFT.y * cell }
  }

  for (const city of visibleCities) {
    const collocated = visibleOutposts.some(outpost => sameCell(outpost.coordinates, city.coordinates))
    markers.push({
      kind: 'city',
      key: `city-${city.id}`,
      marker: city,
      relation: city.relation,
      coordinates: city.coordinates,
      center: centerOf(city.coordinates, collocated ? -1 : 0),
      radius: Math.max(MIN_CITY_RADIUS_PX, CITY_RADIUS_RATIO[city.size] * cell * (collocated ? 0.75 : 1)),
      current: current?.kind === 'city' && current.id === city.id,
    })
  }
  for (const outpost of visibleOutposts) {
    const collocated = visibleCities.some(city => sameCell(city.coordinates, outpost.coordinates))
    const temporary = outpost.type === OutpostType.TEMPORARY
    markers.push({
      kind: 'outpost',
      key: `outpost-${outpost.id}`,
      marker: outpost,
      relation: outpost.relation,
      coordinates: outpost.coordinates,
      center: centerOf(outpost.coordinates, collocated ? 1 : 0),
      radius: Math.max(4, (temporary ? TEMPORARY_OUTPOST_RATIO : PERMANENT_OUTPOST_RATIO) * cell * (collocated ? 0.75 : 1)),
      hollow: temporary,
      current: current?.kind === 'outpost' && current.id === outpost.id,
    })
  }
  return markers
}

/** Settlements on one cell. */
export const settlementsAt = (
  coordinates: Coordinates,
  data: { cities: WorldMarkerCity[]; outposts: WorldMarkerOutpost[] } | undefined
): { city: WorldMarkerCity | null; outpost: WorldMarkerOutpost | null } => ({
  city: data?.cities.find(city => sameCell(city.coordinates, coordinates)) ?? null,
  outpost: data?.outposts.find(outpost => sameCell(outpost.coordinates, coordinates)) ?? null,
})

export const outpostLabel = (type: OutpostType): string =>
  type === OutpostType.PERMANENT ? 'Avant-poste' : 'Camp temporaire'

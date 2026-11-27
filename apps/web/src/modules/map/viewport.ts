import { Coordinates, WORLD_SIZE } from '@eoneom/api-client'

/**
 * Map window (slice 044). Zoom is a number of rows (cells tall); columns follow the stage aspect so cells stay square.
 * World units: cell (x, y) spans [x − 0.5, x + 0.5] × [y − 0.5, y + 0.5]; north (higher y) is drawn at the top.
 */
export const MAP_ZOOM_ROWS = [ 7, 11, 15, 21, 29, 41 ] as const
export type MapZoomLevel = 1 | 2 | 3 | 4 | 5 | 6
export const MIN_ZOOM_LEVEL: MapZoomLevel = 1
export const MAX_ZOOM_LEVEL: MapZoomLevel = 6
/** On open and on « Recentrer » (15 rows). */
export const DEFAULT_ZOOM_LEVEL: MapZoomLevel = 3
/** City names are drawn on the stage from level 1 to 3 (cells ≥ 40 px). */
export const LABEL_MIN_CELL_PX = 40

export interface StageSize {
  width: number
  height: number
}

/** Fractional centre in world units. */
export type MapPoint = { x: number; y: number }

export interface ViewportBounds {
  min_x: number
  max_x: number
  min_y: number
  max_y: number
}

export interface MapWindow {
  zoom: MapZoomLevel
  rows: number
  columns: number
  /** Edge of one cell in px. */
  cellSize: number
  /** Clamped centre (world units). */
  center: MapPoint
  /** World x of the stage's left edge and world y of its top edge. */
  left: number
  top: number
  widthCells: number
  heightCells: number
  /** Integer cells drawn: the visible ones plus one cell of margin, clamped to the world. */
  range: ViewportBounds
}

export const clampZoomLevel = (level: number): MapZoomLevel =>
  Math.max(MIN_ZOOM_LEVEL, Math.min(MAX_ZOOM_LEVEL, Math.round(level))) as MapZoomLevel

const zoomRows = (level: MapZoomLevel): number => MAP_ZOOM_ROWS[level - 1]

export const zoomColumns = (level: MapZoomLevel, stage: StageSize): number =>
  stage.height > 0 ? Math.ceil(zoomRows(level) * stage.width / stage.height) : zoomRows(level)

const clampAxis = (value: number, span: number): number => {
  const min = 0.5 + span / 2
  const max = WORLD_SIZE + 0.5 - span / 2
  if (min > max) return (WORLD_SIZE + 1) / 2
  return Math.max(min, Math.min(max, value))
}

/** Keeps the window inside the world (no space outside 1–100). */
export const clampCenter = (center: MapPoint, zoom: MapZoomLevel, stage: StageSize): MapPoint => {
  const cellSize = stage.height > 0 ? stage.height / zoomRows(zoom) : 1
  return {
    x: clampAxis(center.x, stage.width / cellSize),
    y: clampAxis(center.y, stage.height / cellSize),
  }
}

const clampCell = (value: number): number => Math.max(1, Math.min(WORLD_SIZE, value))

export const mapWindow = ({
  center,
  zoom,
  stage,
}: {
  center: MapPoint
  zoom: MapZoomLevel
  stage: StageSize
}): MapWindow => {
  const rows = zoomRows(zoom)
  const cellSize = stage.height > 0 ? stage.height / rows : 1
  const widthCells = stage.width / cellSize
  const heightCells = stage.height / cellSize
  const clamped = clampCenter(center, zoom, stage)
  const left = clamped.x - widthCells / 2
  const top = clamped.y + heightCells / 2
  return {
    zoom,
    rows,
    columns: zoomColumns(zoom, stage),
    cellSize,
    center: clamped,
    left,
    top,
    widthCells,
    heightCells,
    range: {
      min_x: clampCell(Math.floor(left + 0.5) - 1),
      max_x: clampCell(Math.ceil(left + widthCells - 0.5) + 1),
      min_y: clampCell(Math.floor(top - heightCells + 0.5) - 1),
      max_y: clampCell(Math.ceil(top - 0.5) + 1),
    },
  }
}

/** Stage pixel of a world point. */
export const worldToStage = (point: MapPoint, view: MapWindow): { px: number; py: number } => ({
  px: (point.x - view.left) * view.cellSize,
  py: (view.top - point.y) * view.cellSize,
})

/** World point under a stage pixel. */
export const stageToWorld = (px: number, py: number, view: MapWindow): MapPoint => ({
  x: view.left + px / view.cellSize,
  y: view.top - py / view.cellSize,
})

/** Cell under a stage pixel, `null` outside the world. */
export const cellAtStagePoint = (px: number, py: number, view: MapWindow): Coordinates | null => {
  const world = stageToWorld(px, py, view)
  const x = Math.round(world.x)
  const y = Math.round(world.y)
  if (x < 1 || x > WORLD_SIZE || y < 1 || y > WORLD_SIZE) return null
  return { x, y }
}

/** New centre after a zoom so the world point under the pointer stays under it (`centerAfterZoom`). */
export const centerAfterZoom = ({
  anchor,
  center,
  fromZoom,
  toZoom,
  stage,
}: {
  anchor: MapPoint
  center: MapPoint
  fromZoom: MapZoomLevel
  toZoom: MapZoomLevel
  stage: StageSize
}): MapPoint => {
  const ratio = zoomRows(toZoom) / zoomRows(fromZoom)
  return clampCenter({
    x: anchor.x + (center.x - anchor.x) * ratio,
    y: anchor.y + (center.y - anchor.y) * ratio,
  }, toZoom, stage)
}

/** Drag: the world follows the pointer. */
export const panByPixels = (center: MapPoint, delta: { dx: number; dy: number }, cellSize: number): MapPoint => ({
  x: center.x - delta.dx / cellSize,
  y: center.y + delta.dy / cellSize,
})

/** Arrow keys: 1 cell, 5 with `Shift`. */
const PAN_KEYS: Record<string, { dx: number; dy: number }> = {
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  ArrowUp: { dx: 0, dy: 1 },
  ArrowDown: { dx: 0, dy: -1 },
}

export const panByKey = (center: MapPoint, key: string, shift: boolean): MapPoint | null => {
  const step = PAN_KEYS[key]
  if (!step) return null
  const cells = shift ? 5 : 1
  return { x: center.x + step.dx * cells, y: center.y + step.dy * cells }
}

/** Markers bounds: the drawn range padded by half its size on each side, clamped to the world (side ≤ 100). */
export const paddedBounds = (range: ViewportBounds): ViewportBounds => {
  const padX = Math.ceil((range.max_x - range.min_x + 1) / 2)
  const padY = Math.ceil((range.max_y - range.min_y + 1) / 2)
  return {
    min_x: clampCell(range.min_x - padX),
    max_x: clampCell(range.max_x + padX),
    min_y: clampCell(range.min_y - padY),
    max_y: clampCell(range.max_y + padY),
  }
}

export const boundsContain = (outer: ViewportBounds, inner: ViewportBounds): boolean =>
  inner.min_x >= outer.min_x && inner.max_x <= outer.max_x && inner.min_y >= outer.min_y && inner.max_y <= outer.max_y

export const isInBounds = (coordinates: Coordinates, bounds: ViewportBounds): boolean =>
  coordinates.x >= bounds.min_x && coordinates.x <= bounds.max_x
  && coordinates.y >= bounds.min_y && coordinates.y <= bounds.max_y

import { CELL_WORLD_SIZE } from '#map/helper'
import { ViewportBounds, WORLD_SIZE } from '#map/viewport'

function clampGameCoord(value: number): number {
  return Math.max(1, Math.min(WORLD_SIZE, Math.round(value)))
}

export const MAP_FIT_PADDING = 0.98
/** Dampens how many game cells move per screen pixel while panning. */
export const PAN_PIXEL_TO_CELL_SENSITIVITY = 0.4

export function cellTopLeft(
  gameX: number,
  gameY: number,
  bounds: ViewportBounds,
  cell: number,
): { x: number; y: number } {
  return {
    x: (gameX - bounds.min_x) * cell,
    y: (bounds.max_y - gameY) * cell,
  }
}

export function cellCenter(
  gameX: number,
  gameY: number,
  bounds: ViewportBounds,
  cell: number,
): { x: number; y: number } {
  const top = cellTopLeft(gameX, gameY, bounds, cell)
  return {
    x: top.x + cell / 2,
    y: top.y + cell / 2,
  }
}

export function panCenterByPixels(
  center: { x: number; y: number },
  pixelDelta: { dx: number; dy: number },
  scale: number,
): { x: number; y: number } {
  if (scale <= 0) {
    return center
  }
  const cellDeltaX =
    (-pixelDelta.dx / (scale * CELL_WORLD_SIZE)) * PAN_PIXEL_TO_CELL_SENSITIVITY
  const cellDeltaY =
    (pixelDelta.dy / (scale * CELL_WORLD_SIZE)) * PAN_PIXEL_TO_CELL_SENSITIVITY
  return {
    x: clampGameCoord(center.x + cellDeltaX),
    y: clampGameCoord(center.y + cellDeltaY),
  }
}

export function gameCellAtStagePoint(
  px: number,
  py: number,
  bounds: ViewportBounds,
  scale: number,
  position: { x: number; y: number },
): { x: number; y: number } {
  const localX = (px - position.x) / scale
  const localY = (py - position.y) / scale
  const gx = bounds.min_x + localX / CELL_WORLD_SIZE
  const gy = bounds.max_y - localY / CELL_WORLD_SIZE
  return {
    x: clampGameCoord(gx),
    y: clampGameCoord(gy),
  }
}

export function centerAfterZoom(
  anchor: { x: number; y: number },
  center: { x: number; y: number },
  oldHalf: number,
  newHalf: number,
): { x: number; y: number } {
  if (oldHalf <= 0 || oldHalf === newHalf) {
    return center
  }
  const nx = anchor.x - ((anchor.x - center.x) * newHalf) / oldHalf
  const ny = anchor.y - ((anchor.y - center.y) * newHalf) / oldHalf
  return {
    x: clampGameCoord(nx),
    y: clampGameCoord(ny),
  }
}

export function mapViewScaleAndPosition(
  stageWidth: number,
  stageHeight: number,
  bounds: ViewportBounds,
): { scale: number; position: { x: number; y: number } } {
  const widthCells = bounds.max_x - bounds.min_x + 1
  const heightCells = bounds.max_y - bounds.min_y + 1
  const mapExtentW = widthCells * CELL_WORLD_SIZE
  const mapExtentH = heightCells * CELL_WORLD_SIZE
  const w = stageWidth
  const h = stageHeight
  if (w < 32 || h < 32 || mapExtentW <= 0 || mapExtentH <= 0) {
    return {
      scale: 1,
      position: {
        x: 0,
        y: 0 
      } 
    }
  }
  const s = Math.min(
    (w * MAP_FIT_PADDING) / mapExtentW,
    (h * MAP_FIT_PADDING) / mapExtentH,
  )
  return {
    scale: s,
    position: {
      x: (w - mapExtentW * s) / 2,
      y: (h - mapExtentH * s) / 2,
    },
  }
}

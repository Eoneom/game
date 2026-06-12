import { CELL_WORLD_SIZE } from '#map/helper'
import { ViewportBounds } from '#map/viewport'

export const MAP_FIT_PADDING = 0.98

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

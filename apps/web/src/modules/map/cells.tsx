import {
  CELL_WORLD_SIZE,
  getCellFillStyle,
  getCellStrokeStyle,
} from '#map/helper'
import { cellTopLeft } from '#map/geometry'
import { WorldViewport } from '#types'
import React from 'react'
import { Rect } from 'react-konva'

export type MapHoverTip = {
  cx: number
  cy: number
}

interface Props {
  viewport: WorldViewport
  hoverTooltip: MapHoverTip | null
  selectedCoordinates?: { x: number; y: number } | null
  onCellClicked: (params: { x: number; y: number }) => void
  onHoverCell: (
    evt: { clientX: number; clientY: number },
    cell: WorldViewport['cells'][number],
  ) => void
}

export const MapCells: React.FC<Props> = ({
  viewport,
  hoverTooltip,
  selectedCoordinates,
  onCellClicked,
  onHoverCell,
}) => (
  <>
    {viewport.cells.map(cell => {
      const { x: rx, y: ry } = cellTopLeft(
        cell.coordinates.x,
        cell.coordinates.y,
        viewport.bounds,
        CELL_WORLD_SIZE,
      )
      const fill = getCellFillStyle({
        type: cell.characteristic?.type,
      })
      const strokeBase = getCellStrokeStyle({
        type: cell.characteristic?.type,
      })
      const isHovered =
        hoverTooltip?.cx === cell.coordinates.x &&
        hoverTooltip?.cy === cell.coordinates.y
      const isSelected =
        selectedCoordinates?.x === cell.coordinates.x &&
        selectedCoordinates?.y === cell.coordinates.y

      return (
        <Rect
          key={`${cell.coordinates.x}-${cell.coordinates.y}`}
          x={rx}
          y={ry}
          width={CELL_WORLD_SIZE}
          height={CELL_WORLD_SIZE}
          cursor="pointer"
          fill={fill}
          stroke={
            isSelected ? '#ffd700' : isHovered ? '#ffffff' : strokeBase
          }
          strokeWidth={isSelected ? 4 : isHovered ? 2 : 1}
          onClick={() =>
            onCellClicked({
              x: cell.coordinates.x,
              y: cell.coordinates.y,
            })
          }
          onTap={() =>
            onCellClicked({
              x: cell.coordinates.x,
              y: cell.coordinates.y,
            })
          }
          onMouseEnter={e => onHoverCell(e.evt, cell)}
          onMouseMove={e => onHoverCell(e.evt, cell)}
        />
      )
    })}
  </>
)

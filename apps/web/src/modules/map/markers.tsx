import { CELL_WORLD_SIZE } from '#map/helper'
import { cellCenter } from '#map/geometry'
import React, { useMemo } from 'react'
import { Circle, Group, Text } from 'react-konva'

interface Props {
  sectorId: number
  gridDim: number
  cityMarker?: { sector: number; x: number; y: number } | null
  outpostMarker?: { sector: number; x: number; y: number } | null
}

export const MapMarkers: React.FC<Props> = ({
  sectorId,
  gridDim,
  cityMarker,
  outpostMarker,
}) => {
  const sameCityOutpostCell =
    cityMarker &&
    outpostMarker &&
    cityMarker.sector === sectorId &&
    outpostMarker.sector === sectorId &&
    cityMarker.x === outpostMarker.x &&
    cityMarker.y === outpostMarker.y

  const content = useMemo(() => {
    const list: React.ReactNode[] = []
    const addCity = (ox: number, oy: number) => {
      if (!cityMarker || cityMarker.sector !== sectorId) {
        return
      }
      const c = cellCenter(cityMarker.x, cityMarker.y, gridDim, CELL_WORLD_SIZE)
      list.push(
        <Circle
          key="city"
          x={c.x + ox}
          y={c.y + oy}
          radius={14}
          fill="rgba(241,196,15,0.35)"
          stroke="#f1c40f"
          strokeWidth={3}
          listening={false}
        />,
      )
      list.push(
        <Text
          key="city-label"
          x={c.x + ox - 18}
          y={c.y + oy + 18}
          text="Ville"
          fontSize={13}
          fontFamily="Munson, system-ui, sans-serif"
          fill="#f1c40f"
          listening={false}
        />,
      )
    }
    const addOutpost = (ox: number, oy: number) => {
      if (!outpostMarker || outpostMarker.sector !== sectorId) {
        return
      }
      const c = cellCenter(
        outpostMarker.x,
        outpostMarker.y,
        gridDim,
        CELL_WORLD_SIZE,
      )
      list.push(
        <Circle
          key="outpost"
          x={c.x + ox}
          y={c.y + oy}
          radius={12}
          fill="rgba(212,137,74,0.4)"
          stroke="#D4894A"
          strokeWidth={2}
          listening={false}
        />,
      )
      list.push(
        <Text
          key="outpost-label"
          x={c.x + ox - 28}
          y={c.y + oy + 16}
          text="Avant-poste"
          fontSize={12}
          fontFamily="Munson, system-ui, sans-serif"
          fill="#D4894A"
          listening={false}
        />,
      )
    }

    if (sameCityOutpostCell) {
      addCity(-16, -10)
      addOutpost(16, 10)
    } else {
      addCity(0, 0)
      addOutpost(0, 0)
    }

    return list
  }, [
    cityMarker,
    gridDim,
    outpostMarker,
    sameCityOutpostCell,
    sectorId,
  ])

  return <Group listening={false}>{content}</Group>
}

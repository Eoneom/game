import { CELL_WORLD_SIZE } from '#map/helper'
import { cellCenter } from '#map/geometry'
import { ViewportBounds } from '#map/viewport'
import { Coordinates } from '@eoneom/api-client'
import React, { useMemo } from 'react'
import { Circle, Group, Text } from 'react-konva'

interface Props {
  bounds: ViewportBounds
  cityMarker?: Coordinates | null
  outpostMarker?: Coordinates | null
}

const isInBounds = (marker: Coordinates, bounds: ViewportBounds): boolean =>
  marker.x >= bounds.min_x
  && marker.x <= bounds.max_x
  && marker.y >= bounds.min_y
  && marker.y <= bounds.max_y

export const MapMarkers: React.FC<Props> = ({
  bounds,
  cityMarker,
  outpostMarker,
}) => {
  const sameCityOutpostCell =
    cityMarker &&
    outpostMarker &&
    isInBounds(cityMarker, bounds) &&
    isInBounds(outpostMarker, bounds) &&
    cityMarker.x === outpostMarker.x &&
    cityMarker.y === outpostMarker.y

  const content = useMemo(() => {
    const list: React.ReactNode[] = []
    const addCity = (ox: number, oy: number) => {
      if (!cityMarker || !isInBounds(cityMarker, bounds)) {
        return
      }
      const c = cellCenter(cityMarker.x, cityMarker.y, bounds, CELL_WORLD_SIZE)
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
      if (!outpostMarker || !isInBounds(outpostMarker, bounds)) {
        return
      }
      const c = cellCenter(
        outpostMarker.x,
        outpostMarker.y,
        bounds,
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
    bounds,
    cityMarker,
    outpostMarker,
    sameCityOutpostCell,
  ])

  return <Group listening={false}>{content}</Group>
}

import {
  CELL_WORLD_SIZE,
  getSettlementOwnership,
  settlementMarkerStyles,
} from '#map/helper'
import { cellCenter } from '#map/geometry'
import { ViewportBounds } from '#map/viewport'
import {
  Coordinates,
  OutpostType,
  WorldMapCityMarker,
  WorldMapOutpostMarker,
} from '@eoneom/api-client'
import React, { useMemo } from 'react'
import { Circle, Group, Text } from 'react-konva'

interface Viewer {
  player_id: string
  faction_code: string
}

interface Props {
  bounds: ViewportBounds
  viewer: Viewer
  cities: WorldMapCityMarker[]
  outposts: WorldMapOutpostMarker[]
  highlightCity?: Coordinates | null
  highlightOutpost?: Coordinates | null
}

const isInBounds = (marker: Coordinates, bounds: ViewportBounds): boolean =>
  marker.x >= bounds.min_x
  && marker.x <= bounds.max_x
  && marker.y >= bounds.min_y
  && marker.y <= bounds.max_y

const sameCell = (a: Coordinates, b: Coordinates): boolean =>
  a.x === b.x && a.y === b.y

export const MapMarkers: React.FC<Props> = ({
  bounds,
  viewer,
  cities,
  outposts,
  highlightCity,
  highlightOutpost,
}) => {
  const content = useMemo(() => {
    const list: React.ReactNode[] = []

    const citiesInView = cities.filter(city => isInBounds(city.coordinates, bounds))
    const outpostsInView = outposts.filter(outpost => isInBounds(outpost.coordinates, bounds))

    const addCity = (
      city: WorldMapCityMarker,
      ox: number,
      oy: number,
      emphasized: boolean,
    ) => {
      const ownership = getSettlementOwnership({
        owner_player_id: city.player_id,
        owner_faction_code: city.faction_code,
        viewer_player_id: viewer.player_id,
        viewer_faction_code: viewer.faction_code,
      })
      const style = settlementMarkerStyles[ownership]
      const c = cellCenter(city.coordinates.x, city.coordinates.y, bounds, CELL_WORLD_SIZE)
      const radius = emphasized ? 16 : 12
      list.push(
        <Circle
          key={`city-${city.id}`}
          x={c.x + ox}
          y={c.y + oy}
          radius={radius}
          fill={style.cityFill}
          stroke={style.cityStroke}
          strokeWidth={emphasized ? 4 : 2}
          listening={false}
        />,
      )
      list.push(
        <Text
          key={`city-label-${city.id}`}
          x={c.x + ox - 22}
          y={c.y + oy + radius + 2}
          text={city.name}
          fontSize={emphasized ? 13 : 11}
          fontFamily="Munson, system-ui, sans-serif"
          fill={style.cityStroke}
          listening={false}
        />,
      )
    }

    const addOutpost = (
      outpost: WorldMapOutpostMarker,
      ox: number,
      oy: number,
      emphasized: boolean,
    ) => {
      const ownership = getSettlementOwnership({
        owner_player_id: outpost.player_id,
        owner_faction_code: outpost.faction_code,
        viewer_player_id: viewer.player_id,
        viewer_faction_code: viewer.faction_code,
      })
      const style = settlementMarkerStyles[ownership]
      const c = cellCenter(
        outpost.coordinates.x,
        outpost.coordinates.y,
        bounds,
        CELL_WORLD_SIZE,
      )
      const radius = emphasized ? 14 : 10
      const label =
        outpost.type === OutpostType.PERMANENT ? 'Avant-poste' : 'Camp temporaire'
      list.push(
        <Circle
          key={`outpost-${outpost.id}`}
          x={c.x + ox}
          y={c.y + oy}
          radius={radius}
          fill={style.outpostFill}
          stroke={style.outpostStroke}
          strokeWidth={emphasized ? 3 : 2}
          listening={false}
        />,
      )
      list.push(
        <Text
          key={`outpost-label-${outpost.id}`}
          x={c.x + ox - 34}
          y={c.y + oy + radius + 2}
          text={label}
          fontSize={emphasized ? 12 : 10}
          fontFamily="Munson, system-ui, sans-serif"
          fill={style.outpostStroke}
          listening={false}
        />,
      )
    }

    const paired = new Set<string>()

    for (const city of citiesInView) {
      const collocated = outpostsInView.find(outpost =>
        sameCell(city.coordinates, outpost.coordinates))
      const emphasizedCity =
        highlightCity != null && sameCell(city.coordinates, highlightCity)
      if (collocated) {
        paired.add(collocated.id)
        addCity(city, -16, -10, emphasizedCity)
        addOutpost(
          collocated,
          16,
          10,
          highlightOutpost != null && sameCell(collocated.coordinates, highlightOutpost),
        )
      } else {
        addCity(city, 0, 0, emphasizedCity)
      }
    }

    for (const outpost of outpostsInView) {
      if (paired.has(outpost.id)) {
        continue
      }
      addOutpost(
        outpost,
        0,
        0,
        highlightOutpost != null && sameCell(outpost.coordinates, highlightOutpost),
      )
    }

    return list
  }, [
    bounds,
    cities,
    highlightCity,
    highlightOutpost,
    outposts,
    viewer.faction_code,
    viewer.player_id,
  ])

  return <Group listening={false}>{content}</Group>
}

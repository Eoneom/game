import React, { useMemo, useState } from 'react'

import { MapCanvas } from '#map/canvas'
import { MapDetails } from '#map/details'
import { useWorld } from '#map/hook/world'
import { INITIAL_VIEWPORT_HALF_EXTENT } from '#map/viewport'
import { useGetCity } from '#city/hooks'
import { useGetOutpost } from '#outpost/hooks'
import { useListTroops } from '#troop/hooks'
import { LayoutPage } from '#ui/layout/page'

type MapPageProps =
  | { cityId: string; outpostId?: never }
  | { cityId?: never; outpostId: string }

export const MapPage: React.FC<MapPageProps> = ({ cityId, outpostId }) => {
  const { data: city } = useGetCity(cityId)
  const { data: outpost } = useGetOutpost(outpostId)
  useListTroops(cityId ? { cityId } : { outpostId: outpostId as string })

  const cityCoordinates = city?.coordinates ?? null
  const outpostCoordinates = outpost?.coordinates ?? null
  const homeCenter = cityCoordinates ?? outpostCoordinates

  const {
    fetch,
    viewport,
    center,
    half_extent,
    navigate,
    panTo,
  } = useWorld()
  const [selectedCoordinates, setSelectedCoordinates] = useState<{ x: number, y: number} | null>(null)

  React.useEffect(() => {
    const initialCenter = cityCoordinates ?? outpostCoordinates
    if (!initialCenter) return
    void fetch({
      center: initialCenter,
      half_extent: INITIAL_VIEWPORT_HALF_EXTENT,
    })
  }, [
    cityCoordinates,
    outpostCoordinates,
  ])

  const details = useMemo(() => {
    if (!selectedCoordinates || !viewport) return null
    if (cityId) {
      return <MapDetails cityId={cityId} coordinates={selectedCoordinates} viewport={viewport} />
    }
    if (!outpostId) {
      return null
    }
    return <MapDetails outpostId={outpostId} coordinates={selectedCoordinates} viewport={viewport} />
  }, [
    cityId,
    outpostId,
    selectedCoordinates,
    viewport,
  ])

  const navigation =
    center == null
      ? null
      : {
        center,
        half_extent,
        homeCenter,
        onPanEnd: panTo,
        onNavigate: navigate,
        onRecenter: homeCenter
          ? () => {
            void fetch({
              center: homeCenter,
              half_extent: INITIAL_VIEWPORT_HALF_EXTENT,
            })
          }
          : undefined,
      }

  return <LayoutPage details={details}>
    {viewport && navigation && (
      <div className="map-page">
        <MapCanvas
          viewport={viewport}
          navigation={navigation}
          onCellClicked={setSelectedCoordinates}
          selectedCoordinates={selectedCoordinates}
          highlightCity={cityCoordinates}
          highlightOutpost={outpostCoordinates}
        />
      </div>
    )}
  </LayoutPage>
}

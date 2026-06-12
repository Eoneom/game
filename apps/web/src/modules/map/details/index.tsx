import React, { useMemo } from 'react'

import { MovementAction, TroopCode } from '@eoneom/api-client'

import { Button } from '#ui/button'
import { LayoutDetailsContent } from '#ui/layout/details/content'
import { MapDetailsActionBase } from '#map/details/action/base'
import { WorldViewport } from '#types'
import { useGetCity } from '#city/hooks'
import { useGetOutpost } from '#outpost/hooks'
import { useCreateMovement } from '#troop/hooks'

type Props =
  | { cityId: string; outpostId?: never }
  | { cityId?: never; outpostId: string }
interface DetailsInput {
  coordinates: {
    x: number
    y: number
  }
  viewport: WorldViewport
}

export const MapDetails: React.FC<Props & DetailsInput> = ({ cityId, outpostId, coordinates, viewport }) => {
  const { data: city } = useGetCity(cityId)
  const { data: outpost } = useGetOutpost(outpostId)
  const createMovement = useCreateMovement()

  const selectedCell = useMemo(() => {
    if (!coordinates) return null
    return viewport.cells.find(cell =>
      cell.coordinates.x === coordinates.x &&
      cell.coordinates.y === coordinates.y
    )
  }, [
    viewport,
    coordinates
  ])

  const handleExplore = () => {
    if (!viewport || !coordinates) return
    const origin = city ? city.coordinates : outpost?.coordinates
    if (!origin) return

    createMovement.mutate({
      action: MovementAction.EXPLORE,
      origin,
      destination: {
        x: coordinates.x,
        y: coordinates.y 
      },
      troops: [
        {
          code: TroopCode.EXPLORER,
          count: 1 
        }
      ]
    })
  }

  const isCityTile =
    city?.coordinates.x === coordinates.x &&
    city?.coordinates.y === coordinates.y

  return <LayoutDetailsContent>
    <div className="details-block">
      <div>
        <h2>Cellule sélectionnée</h2>
        <p className="details-meta">
          Coordonnées{' '}
          <span className="details-coordinates">
            ({coordinates.x}, {coordinates.y})
          </span>
        </p>
      </div>
      {isCityTile && city && <p className="details-highlight">{city.name}</p>}
      {selectedCell && !selectedCell.characteristic && (
        <div className="details-actions">
          <Button onClick={handleExplore}>Explorer</Button>
        </div>
      )}
      {selectedCell && selectedCell.characteristic && viewport && (
        cityId
          ? <MapDetailsActionBase
            cityId={cityId}
            coordinates={{
              x: coordinates.x,
              y: coordinates.y 
            }}
          />
          : outpostId
            ? <MapDetailsActionBase
              outpostId={outpostId}
              coordinates={{
                x: coordinates.x,
                y: coordinates.y 
              }}
            />
            : null
      )}
    </div>
  </LayoutDetailsContent>
}

import React, { useMemo } from 'react'

import { MovementAction, TroopRole, troop_role } from '@eoneom/api-client'

import { Button } from '#ui/button'
import { LayoutDetailsContent } from '#ui/layout/details/content'
import { MapDetailsActionBase } from '#map/details/action/base'
import { WorldViewport } from '#types'
import { useGetCity } from '#city/hooks'
import { useGetOutpost } from '#outpost/hooks'
import { useCreateMovement, useListTroops } from '#troop/hooks'

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
  const { data: troops = [] } = useListTroops(
    cityId ? { cityId } : { outpostId: outpostId as string }
  )
  const createMovement = useCreateMovement()

  const scout = useMemo(() => {
    return troops.find(troop => troop_role[troop.code] === TroopRole.SCOUT)
  }, [troops])

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

    if (!scout || scout.count < 1) return

    createMovement.mutate({
      action: MovementAction.EXPLORE,
      origin,
      destination: {
        x: coordinates.x,
        y: coordinates.y 
      },
      troops: [
        {
          code: scout.code,
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

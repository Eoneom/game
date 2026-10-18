import React, { useMemo } from 'react'

import { MovementAction } from '@eoneom/api-client'

import { LayoutDetailsContent } from '#ui/layout/details/content'
import { MovementCreate } from '#movement/create'
import { WorldViewport } from '#types'
import { useGetCity } from '#city/hooks'
import { useGetOutpost } from '#outpost/hooks'

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

const EXPLORED_CELL_ACTIONS = [
  MovementAction.BASE,
  MovementAction.TRANSPORT,
  MovementAction.ATTACK,
] as const

export const MapDetails: React.FC<Props & DetailsInput> = ({ cityId, outpostId, coordinates, viewport }) => {
  const { data: city } = useGetCity(cityId)
  const { data: outpost } = useGetOutpost(outpostId)

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

  const isCityTile =
    city?.coordinates.x === coordinates.x &&
    city?.coordinates.y === coordinates.y

  const movementProps = cityId
    ? { cityId, fixedDestination: coordinates, compact: true as const }
    : { outpostId: outpostId as string, fixedDestination: coordinates, compact: true as const }

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
      {selectedCell?.explored && selectedCell.characteristic && (
        <div className="details-block">
          <h3 className="m-0 field-label">Coefficients de la cellule</h3>
          <ul className="m-0 list-none space-y-1 p-0 text-sm text-amber-dim">
            <li>
              Plastique :{' '}
              <span className="font-mono tabular-nums">
                {selectedCell.characteristic.resource_coefficient.plastic.toFixed(2)}
              </span>
            </li>
            <li>
              Champignon :{' '}
              <span className="font-mono tabular-nums">
                {selectedCell.characteristic.resource_coefficient.mushroom.toFixed(2)}
              </span>
            </li>
            <li>
              Solaire :{' '}
              <span className="font-mono tabular-nums">
                {selectedCell.characteristic.solar_coefficient.toFixed(2)}
              </span>
            </li>
          </ul>
        </div>
      )}
      {selectedCell && !selectedCell.explored && (
        <div className="details-block">
          <h3 className="m-0 field-label">Explorer</h3>
          <MovementCreate
            {...movementProps}
            allowedActions={[MovementAction.EXPLORE]}
          />
        </div>
      )}
      {selectedCell?.explored && (
        <div className="details-block">
          <h3 className="m-0 field-label">Déplacement</h3>
          <MovementCreate
            {...movementProps}
            allowedActions={[...EXPLORED_CELL_ACTIONS]}
          />
        </div>
      )}
    </div>
  </LayoutDetailsContent>
}

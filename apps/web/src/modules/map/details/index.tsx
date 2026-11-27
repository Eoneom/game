import React, { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { MovementAction } from '@eoneom/api-client'

import { LayoutDetailsContent } from '#ui/layout/details/content'
import { movementOriginOf, movementSendPath } from '#movement/navigation'
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

const AnyLink = Link as React.ComponentType<{
  to: string
  search?: Record<string, string | number>
  className?: string
  children: React.ReactNode
}>

const sendLinkClass = 'neon-amber motion-safe-neon inline-block rounded-sm border border-copper bg-copper/30 px-3 py-2 text-meta font-semibold uppercase tracking-wide text-amber hover:bg-copper/50'

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

  // The send wizard (slice 045) takes the cell as destination; slice 044 replaces this panel with its cell actions.
  const sendPath = movementSendPath(movementOriginOf({ cityId, outpostId }))

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
          <ul className="m-0 list-none space-y-1 p-0 text-body text-amber-dim">
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
        <AnyLink
          to={sendPath}
          search={{ x: coordinates.x, y: coordinates.y, action: MovementAction.EXPLORE }}
          className={sendLinkClass}
        >
          Explorer cette case
        </AnyLink>
      )}
      {selectedCell?.explored && !isCityTile && (
        <AnyLink to={sendPath} search={{ x: coordinates.x, y: coordinates.y }} className={sendLinkClass}>
          Envoyer des troupes ici
        </AnyLink>
      )}
    </div>
  </LayoutDetailsContent>
}

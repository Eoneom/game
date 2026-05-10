import React from 'react'

import { LayoutDetailsContent } from '#ui/layout/details/content'
import { MovementActionLabels } from '#movement/translations'
import { TroopTranslations } from '#troop/translations'
import { Movement } from '#types'
import { formatCoordinates } from '#helpers/transform'

interface Props {
  movement: Movement
}

export const MovementDetails: React.FC<Props> = ({ movement }) => {
  return (
    <LayoutDetailsContent>
      <h2>{MovementActionLabels[movement.action]}</h2>
      <div className="details-block">
        <p className="details-meta">
          Arrivée prévue :{' '}
          <time dateTime={new Date(movement.arrive_at).toISOString()}>
            {new Date(movement.arrive_at).toLocaleString()}
          </time>
        </p>
        <p className="details-meta">
          Départ :{' '}
          <span className="details-coordinates">{formatCoordinates(movement.origin)}</span>
        </p>
        <p className="details-meta">
          Arrivée :{' '}
          <span className="details-coordinates">{formatCoordinates(movement.destination)}</span>
        </p>
        {(movement.resources.plastic > 0 || movement.resources.mushroom > 0) && (
          <p className="details-meta">
            Cargo : {movement.resources.plastic} plastique, {movement.resources.mushroom} champignon
          </p>
        )}
      </div>

      <h3>Troupes</h3>
      <ul>
        {movement.troops.map(troop => {
          const { name } = TroopTranslations[troop.code]
          return (
            <li key={troop.code}>
              {name} — {troop.count}
            </li>
          )
        })}
      </ul>
    </LayoutDetailsContent>
  )
}

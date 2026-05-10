import React from 'react'

import { formatTime } from '#helpers/transform'
import { MovementEstimation } from '#types'

interface Props {
  estimation: MovementEstimation
}

export const MovementCreateEstimation: React.FC<Props> = ({ estimation }) => {
  if (!estimation.distance) {
    return (
      <p className="movement-estimation-empty">
        Sélectionnez des troupes et une destination valide pour voir l&apos;estimation.
      </p>
    )
  }

  return (
    <div className="movement-estimation">
      <h3 className="movement-block-heading">Estimation</h3>
      <ul className="app-list app-list--kv movement-estimation__list">
        <li>
          <span>Distance</span>
          <span>{estimation.distance}</span>
        </li>
        <li>
          <span>Vitesse des troupes</span>
          <span>{estimation.speed}</span>
        </li>
        <li>
          <span>Durée</span>
          <span>{formatTime(Math.ceil(estimation.duration))}</span>
        </li>
        <li>
          <span>Capacité de transport</span>
          <span>{estimation.transport_capacity}</span>
        </li>
        <li>
          <span>Heure d&apos;arrivée</span>
          <span>{`${new Date(new Date().getTime() + estimation.duration).toLocaleString()}`}</span>
        </li>
      </ul>
    </div>
  )
}

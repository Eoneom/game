import React from 'react'

import { formatTime } from '#helpers/transform'
import { MovementEstimation } from '#types'

interface Props {
  estimation: MovementEstimation
}

export const MovementCreateEstimation: React.FC<Props> = ({ estimation }) => {
  if (!estimation.distance) {
    return (
      <p className="m-0 rounded-sm border border-rust/40 bg-chrome/50 px-3 py-2 text-sm text-amber-dim">
        Sélectionnez des troupes et une destination valide pour voir l&apos;estimation.
      </p>
    )
  }

  return (
    <div className="space-y-2 rounded-sm border border-amber/30 bg-chrome/60 p-3">
      <h3 className="m-0 field-label">Estimation</h3>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
        <li className="flex justify-between gap-3">
          <span className="text-amber-dim">Distance</span>
          <span className="font-mono text-amber">{estimation.distance}</span>
        </li>
        <li className="flex justify-between gap-3">
          <span className="text-amber-dim">Vitesse des troupes</span>
          <span className="font-mono text-amber">{estimation.speed}</span>
        </li>
        <li className="flex justify-between gap-3">
          <span className="text-amber-dim">Durée</span>
          <span className="font-mono text-amber">{formatTime(Math.ceil(estimation.duration))}</span>
        </li>
        <li className="flex justify-between gap-3">
          <span className="text-amber-dim">Capacité de transport</span>
          <span className="font-mono text-amber">{estimation.transport_capacity}</span>
        </li>
        <li className="flex justify-between gap-3">
          <span className="text-amber-dim">Heure d&apos;arrivée</span>
          <span className="font-mono text-amber">
            {`${new Date(new Date().getTime() + estimation.duration).toLocaleString()}`}
          </span>
        </li>
      </ul>
    </div>
  )
}

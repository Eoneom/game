import React from 'react'

import { IconMushroom } from '#ui/icon/mushroom'
import { IconPlastic } from '#ui/icon/plastic'

interface Props {
  plastic: number
  mushroom: number
  maxPlastic: number
  maxMushroom: number
  capacity: number
  usedCapacity: number
  onChange: (resources: { plastic: number; mushroom: number }) => void
}

export const MovementCreateResources: React.FC<Props> = ({
  plastic,
  mushroom,
  maxPlastic,
  maxMushroom,
  capacity,
  usedCapacity,
  onChange,
}) => {
  return (
    <fieldset className="movement-fieldset">
      <legend className="movement-fieldset__legend">Ressources à transporter</legend>
      <p className="movement-panel__lede">
        Capacité : {usedCapacity} / {capacity}
      </p>
      <ul className="app-list app-list--kv">
        <li>
          <span className="movement-resource-label">
            <IconPlastic /> Plastique
          </span>
          <input
            type="number"
            min={0}
            max={maxPlastic}
            value={plastic}
            onChange={event => {
              const next = Number.parseInt(event.target.value, 10)
              onChange({
                plastic: Number.isNaN(next) ? 0 : Math.min(Math.max(0, next), maxPlastic),
                mushroom,
              })
            }}
          />
        </li>
        <li>
          <span className="movement-resource-label">
            <IconMushroom /> Champignon
          </span>
          <input
            type="number"
            min={0}
            max={maxMushroom}
            value={mushroom}
            onChange={event => {
              const next = Number.parseInt(event.target.value, 10)
              onChange({
                plastic,
                mushroom: Number.isNaN(next) ? 0 : Math.min(Math.max(0, next), maxMushroom),
              })
            }}
          />
        </li>
      </ul>
    </fieldset>
  )
}

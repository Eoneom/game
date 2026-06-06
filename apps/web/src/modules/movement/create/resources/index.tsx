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
    <fieldset className="m-0 space-y-3 border-0 p-0">
      <legend className="mb-0 px-0 field-label">Ressources à transporter</legend>
      <p className="m-0 font-mono text-sm text-amber">
        Capacité : {usedCapacity} / {capacity}
      </p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        <li className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-sm text-amber-dim">
            <IconPlastic /> Plastique
          </span>
          <input
            type="number"
            className="field-input field-input--number w-28"
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
        <li className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-sm text-amber-dim">
            <IconMushroom /> Champignon
          </span>
          <input
            type="number"
            className="field-input field-input--number w-28"
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

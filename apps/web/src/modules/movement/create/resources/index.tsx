import React from 'react'

import { IconMushroom } from '#ui/icon/mushroom'
import { IconPlastic } from '#ui/icon/plastic'
import { IconPlasma } from '#ui/icon/plasma'
import { IconWater } from '#ui/icon/water'
import { Resource } from '@eoneom/api-client'

interface Props {
  plastic: number
  mushroom: number
  plasma: number
  water: number
  maxPlastic: number
  maxMushroom: number
  maxPlasma: number
  maxWater: number
  /** Water leaves cities only: outposts hold none (slice 035). */
  showWater: boolean
  capacity: number
  usedCapacity: number
  onChange: (resources: Resource) => void
}

export const MovementCreateResources: React.FC<Props> = ({
  plastic,
  mushroom,
  plasma,
  water,
  maxPlastic,
  maxMushroom,
  maxPlasma,
  maxWater,
  showWater,
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
                plasma,
                water,
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
                plasma,
                water,
              })
            }}
          />
        </li>
        <li className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-sm text-amber-dim">
            <IconPlasma /> Plasma
          </span>
          <input
            type="number"
            className="field-input field-input--number w-28"
            min={0}
            max={maxPlasma}
            value={plasma}
            onChange={event => {
              const next = Number.parseInt(event.target.value, 10)
              onChange({
                plastic,
                mushroom,
                plasma: Number.isNaN(next) ? 0 : Math.min(Math.max(0, next), maxPlasma),
                water,
              })
            }}
          />
        </li>
        {showWater && (
          <li className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-sm text-amber-dim">
              <IconWater /> Eau pure
            </span>
            <input
              type="number"
              className="field-input field-input--number w-28"
              min={0}
              max={maxWater}
              value={water}
              onChange={event => {
                const next = Number.parseInt(event.target.value, 10)
                onChange({
                  plastic,
                  mushroom,
                  plasma,
                  water: Number.isNaN(next) ? 0 : Math.min(Math.max(0, next), maxWater),
                })
              }}
            />
          </li>
        )}
      </ul>
    </fieldset>
  )
}

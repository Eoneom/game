import React from 'react'
import classNames from 'classnames'

import { IconMushroom } from '#ui/icon/mushroom'
import { IconPlastic } from '#ui/icon/plastic'
import { IconPlasma } from '#ui/icon/plasma'
import { IconWater } from '#ui/icon/water'
import { MovementSendCargo } from '#movement/send/search'

interface Props {
  cargo: MovementSendCargo
  max: MovementSendCargo
  /** Water leaves cities only: outposts hold none (slice 035). */
  showWater: boolean
  capacity: number
  usedCapacity: number
  onChange: (cargo: MovementSendCargo) => void
}

const formatAmount = (value: number): string => new Intl.NumberFormat('fr-FR').format(value)

const ROWS: { key: keyof MovementSendCargo; label: string; icon: React.ReactNode }[] = [
  { key: 'plastic', label: 'Plastique', icon: <IconPlastic /> },
  { key: 'mushroom', label: 'Champignon', icon: <IconMushroom /> },
  { key: 'plasma', label: 'Plasma', icon: <IconPlasma /> },
  { key: 'water', label: 'Eau pure', icon: <IconWater /> },
]

/** Transport cargo (slice 045): one input per resource with « Max », and the weighted load against the capacity. */
export const MovementSendResources: React.FC<Props> = ({
  cargo,
  max,
  showWater,
  capacity,
  usedCapacity,
  onChange,
}) => {
  const ratio = capacity > 0 ? Math.min(1, usedCapacity / capacity) : 0
  const over = usedCapacity > capacity

  return (
    <fieldset className="m-0 space-y-3 border-0 p-0">
      <legend className="mb-2 px-0 field-label">Cargaison</legend>
      <div className="space-y-1">
        <p className={classNames('m-0 text-meta tabular-nums', over ? 'text-danger' : 'text-amber-dim')}>
          Charge {formatAmount(usedCapacity)} / {formatAmount(capacity)}
        </p>
        <div className="h-1.5 overflow-hidden rounded-sm bg-chrome" aria-hidden>
          <div
            className={classNames('h-full', over ? 'bg-danger' : 'bg-amber')}
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </div>
        <p className="m-0 text-caption text-label">L&apos;eau pèse le double des autres ressources.</p>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {ROWS.filter(row => row.key !== 'water' || showWater).map(row => (
          <li key={row.key} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-body text-amber-dim">
              {row.icon} {row.label}
            </span>
            <span className="flex items-center gap-2">
              <input
                type="number"
                className="field-input field-input--number w-28 tabular-nums"
                aria-label={row.label}
                min={0}
                max={max[row.key]}
                value={cargo[row.key]}
                onChange={event => {
                  const next = Number.parseInt(event.target.value, 10)
                  onChange({
                    ...cargo,
                    [row.key]: Number.isNaN(next) ? 0 : Math.min(Math.max(0, next), max[row.key]),
                  })
                }}
              />
              <button
                type="button"
                className="rounded-sm border border-rust/50 px-2 py-1 text-caption uppercase tracking-wide text-amber-dim hover:border-rust hover:text-amber"
                aria-label={`${row.label} : maximum`}
                onClick={() => onChange({ ...cargo, [row.key]: max[row.key] })}
              >
                Max
              </button>
            </span>
          </li>
        ))}
      </ul>
    </fieldset>
  )
}

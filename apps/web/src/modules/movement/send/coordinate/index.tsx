import React from 'react'
import { WORLD_SIZE } from '@eoneom/api-client'

interface Props {
  label: string
  /** Empty while the player types. */
  value: number | ''
  onChange: (value: number | '') => void
  /** Enter validates the step. */
  onEnter?: () => void
}

export const MovementSendCoordinate: React.FC<Props> = ({ label, value, onChange, onEnter }) => (
  <label className="flex flex-col gap-1">
    <span className="field-label">{label}</span>
    <input
      type="number"
      inputMode="numeric"
      className="field-input field-input--number w-24 tabular-nums"
      aria-label={label}
      min={1}
      max={WORLD_SIZE}
      value={value}
      onChange={event => {
        const next = Number.parseInt(event.target.value, 10)
        onChange(Number.isNaN(next) ? '' : next)
      }}
      onKeyDown={event => {
        if (event.key === 'Enter' && onEnter) {
          event.preventDefault()
          onEnter()
        }
      }}
    />
  </label>
)

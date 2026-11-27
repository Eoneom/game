import React from 'react'

interface Props {
  max: number
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  label: string
}

export const MovementSendTroopInput: React.FC<Props> = ({ max, value, onChange, disabled = false, label }) => {
  return (
    <input
      type="number"
      className="field-input field-input--number w-20 text-center tabular-nums"
      aria-label={label}
      max={max}
      min={0}
      value={value}
      disabled={disabled}
      onChange={event => {
        const next = Number.parseInt(event.target.value, 10)
        if (Number.isNaN(next)) {
          onChange(0)
          return
        }
        onChange(Math.min(Math.max(0, next), max))
      }}
    />
  )
}

import React from 'react'

interface Props {
  max: number
  value: number
  onChange: (value: number) => void
}

export const MovementCreateTroopsInput: React.FC<Props> = ({ max, value, onChange }) => {
  return (
    <input
      type="number"
      className="field-input field-input--number w-20 text-center"
      max={max}
      min={0}
      value={value}
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

import React from 'react'

interface Props {
  placeholder: string
  value: number
  onChange: (value: number) => void
}

export const MovementCreateDestinationCoordinate: React.FC<Props> = ({ placeholder, onChange, value }) => {
  return (
    <input
      type="number"
      className="field-input field-input--number"
      placeholder={placeholder}
      min={1}
      onChange={e => onChange(Number.parseInt(e.target.value))}
      value={value}
    />
  )
}

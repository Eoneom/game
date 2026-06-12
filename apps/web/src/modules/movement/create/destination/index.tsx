import { MovementCreateDestinationCoordinate } from '#movement/create/destination/coordinate'
import { MovementCreateDestinationLocationSelect } from '#movement/create/destination/location-select'
import { Coordinates } from '@eoneom/api-client'
import React, { useState } from 'react'

interface Props {
  destination: Coordinates
  onChange: (coordinates: Coordinates) => void
  excludeCityId?: string
  excludeOutpostId?: string
}

export const MovementCreateDestination: React.FC<Props> = ({
  destination,
  onChange,
  excludeCityId,
  excludeOutpostId,
}) => {
  const [selectedKey, setSelectedKey] = useState('')

  const handleManualChange = (coordinates: Coordinates) => {
    setSelectedKey('')
    onChange(coordinates)
  }

  return (
    <div id="destination" className="space-y-3">
      <h3 className="m-0 field-label">Destination</h3>
      <MovementCreateDestinationLocationSelect
        excludeCityId={excludeCityId}
        excludeOutpostId={excludeOutpostId}
        selectedKey={selectedKey}
        onSelectedKeyChange={setSelectedKey}
        onChange={onChange}
      />
      <div id="coordinates" className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="field-label">X</span>
          <MovementCreateDestinationCoordinate
            value={destination.x}
            placeholder="X"
            onChange={x => handleManualChange({
              ...destination,
              x 
            })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="field-label">Y</span>
          <MovementCreateDestinationCoordinate
            value={destination.y}
            placeholder="Y"
            onChange={y => handleManualChange({
              ...destination,
              y 
            })}
          />
        </label>
      </div>
    </div>
  )
}

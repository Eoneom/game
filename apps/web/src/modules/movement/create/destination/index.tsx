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
    <div className="movement-destination" id="destination">
      <h3 className="movement-block-heading">Destination</h3>
      <MovementCreateDestinationLocationSelect
        excludeCityId={excludeCityId}
        excludeOutpostId={excludeOutpostId}
        selectedKey={selectedKey}
        onSelectedKeyChange={setSelectedKey}
        onChange={onChange}
      />
      <div className="movement-coords-grid" id="coordinates">
        <label className="movement-coord-field">
          <span className="movement-coord-field__label">Secteur</span>
          <MovementCreateDestinationCoordinate
            value={destination.sector}
            placeholder="Secteur"
            onChange={sector => handleManualChange({ ...destination, sector })}
          />
        </label>
        <label className="movement-coord-field">
          <span className="movement-coord-field__label">X</span>
          <MovementCreateDestinationCoordinate
            value={destination.x}
            placeholder="X"
            onChange={x => handleManualChange({ ...destination, x })}
          />
        </label>
        <label className="movement-coord-field">
          <span className="movement-coord-field__label">Y</span>
          <MovementCreateDestinationCoordinate
            value={destination.y}
            placeholder="Y"
            onChange={y => handleManualChange({ ...destination, y })}
          />
        </label>
      </div>
    </div>
  )
}

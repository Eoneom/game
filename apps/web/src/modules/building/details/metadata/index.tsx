import React from 'react'

import {
  isConsumingBuilding,
  isEnergyBuilding,
  isProductionBuilding,
  isWarehouseBuilding
} from '@eoneom/api-client'

import { Building } from '#types'

import { BuildingDetailsMetadataWarehouse } from '#building/details/metadata/warehouse'
import { BuildingDetailsMetadataProduction } from '#building/details/metadata/production'
import { BuildingDetailsMetadataEnergy } from '#building/details/metadata/energy'
import { BuildingDetailsMetadataConsumption } from '#building/details/metadata/consumption'
import { BuildingDetailsSection } from '#building/details/section'

interface Props {
  building: Building
}

export const BuildingDetailsMetadata: React.FC<Props> = ({ building }) => {
  if (isWarehouseBuilding(building)) {
    return <BuildingDetailsMetadataWarehouse
      currentCapacity={building.metadata.current_capacity}
      nextCapacity={building.metadata.next_capacity}
    />
  }

  if (isProductionBuilding(building)) {
    return <>
      <BuildingDetailsMetadataProduction
        currentProduction={building.metadata.current_production}
        nextProduction={building.metadata.next_production}
      />
      <BuildingDetailsSection>
        <BuildingDetailsMetadataConsumption
          currentConsumption={building.metadata.current_consumption}
          nextConsumption={building.metadata.next_consumption}
        />
      </BuildingDetailsSection>
    </>
  }

  if (isConsumingBuilding(building)) {
    return <BuildingDetailsMetadataConsumption
      currentConsumption={building.metadata.current_consumption}
      nextConsumption={building.metadata.next_consumption}
    />
  }

  if (isEnergyBuilding(building)) {
    return <BuildingDetailsMetadataEnergy
      currentEnergy={building.metadata.current_energy}
      nextEnergy={building.metadata.next_energy}
    />
  }

  return null
}

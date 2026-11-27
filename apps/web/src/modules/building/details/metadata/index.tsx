import React from 'react'

import {
  isCommandCenterBuilding,
  isConsumingBuilding,
  isEnergyBuilding,
  isProductionBuilding,
  isShelterBuilding,
  isWarehouseBuilding
} from '@eoneom/api-client'

import { Building } from '#types'

import { BuildingDetailsMetadataWarehouse } from '#building/details/metadata/warehouse'
import { BuildingDetailsMetadataProduction } from '#building/details/metadata/production'
import { BuildingDetailsMetadataEnergy } from '#building/details/metadata/energy'
import { BuildingDetailsMetadataConsumption } from '#building/details/metadata/consumption'
import { BuildingDetailsSection } from '#building/details/section'
import { BuildingDetailsMetadataCommandCenter } from '#building/details/metadata/command-center'
import { BuildingDetailsMetadataShelter } from '#building/details/metadata/shelter'

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

  if (isCommandCenterBuilding(building)) {
    return <>
      <BuildingDetailsMetadataCommandCenter
        currentMovementBonus={building.metadata.current_movement_bonus}
        nextMovementBonus={building.metadata.next_movement_bonus}
        movementLimit={building.metadata.movement_limit}
        recruitQueueLimit={building.metadata.recruit_queue_limit}
      />
      <BuildingDetailsSection>
        <BuildingDetailsMetadataConsumption
          currentConsumption={building.metadata.current_consumption}
          nextConsumption={building.metadata.next_consumption}
        />
      </BuildingDetailsSection>
    </>
  }

  if (isShelterBuilding(building)) {
    return <BuildingDetailsMetadataShelter
      currentSheltered={building.metadata.current_sheltered}
      nextSheltered={building.metadata.next_sheltered}
    />
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

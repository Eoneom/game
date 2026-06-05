import React from 'react'
import { BUILDING_UPGRADE_QUEUE_LIMIT } from '@eoneom/api-client'

import { Building, BuildingItem } from '#types'
import { Button } from '#ui/button'
import { hasEnoughResources } from '#city/helper'
import { useRequirement } from '#requirement/hook'
import { useGetCity } from '#city/hooks'
import { useListBuildings, useUpgradeBuilding } from '#building/hooks'

interface Props {
  cityId: string
  building: Building
}

export const BuildingDetailsUpgrade: React.FC<Props> = ({ cityId, building }) => {
  const { data: city } = useGetCity(cityId)
  const { data } = useListBuildings(cityId)
  const buildings = data?.buildings ?? []
  const upgradeQueue = data?.upgrade_queue ?? []
  const upgrade = useUpgradeBuilding(cityId)
  const { isRequirementMet } = useRequirement({ cityId, requirement: building.requirement })

  const inProgress = buildings.find(
    (b): b is Extract<BuildingItem, { upgrade_at: number }> => 'upgrade_at' in b
  )

  const canStart = !inProgress &&
    city != null &&
    city.building_levels_used < city.maximum_building_levels &&
    hasEnoughResources({ city, cost: building.upgrade_cost }) &&
    isRequirementMet

  const canEnqueue = Boolean(inProgress) && upgradeQueue.length < BUILDING_UPGRADE_QUEUE_LIMIT

  const canBuild = canStart || canEnqueue

  return <Button
    disabled={!canBuild}
    onClick={() => upgrade.mutate(building.code)}
  >
    Construire
  </Button>
}

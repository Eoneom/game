import { Requirement } from '@eoneom/api-client'
import React from 'react'

import { BuildingTranslations } from '#building/translations'
import { useListBuildings } from '#building/hooks'

interface Props {
  cityId: string
  requirement: Requirement['buildings'][number]
}

export const RequirementBuilding: React.FC<Props> = ({ cityId, requirement }) => {
  const { data } = useListBuildings(cityId)
  const buildings = data?.buildings ?? []
  const requiredBuildingLevel = buildings.find(building => building.code === requirement.code)?.level ?? 0
  const isMetClassName = requiredBuildingLevel >= requirement.level ? 'success' : 'danger'

  return <li key={requirement.code} className={isMetClassName}>
    {BuildingTranslations[requirement.code].name} {requirement.level}
  </li>
}

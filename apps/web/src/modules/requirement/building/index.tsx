import { Requirement } from '@eoneom/api-client'
import React from 'react'
import classNames from 'classnames'

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
  const isMet = requiredBuildingLevel >= requirement.level

  return (
    <li
      key={requirement.code}
      className={classNames(
        'rounded-sm px-2 py-1 text-sm',
        isMet
          ? 'text-terminal'
          : 'border border-danger/50 bg-danger-deep/30 font-semibold text-danger'
      )}
    >
      {BuildingTranslations[requirement.code].name} {requirement.level}
      {!isMet && (
        <span className="ml-1 text-xs font-normal opacity-90">
          (actuel {requiredBuildingLevel})
        </span>
      )}
    </li>
  )
}

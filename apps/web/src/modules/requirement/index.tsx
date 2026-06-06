import React from 'react'
import classNames from 'classnames'
import { RequirementBuilding } from '#requirement/building'
import { RequirementTechnology } from '#requirement/technology'
import { Requirement as RequirementValue } from '@eoneom/api-client'
import { useRequirement } from '#requirement/hook'

interface Props {
  cityId: string
  requirements?: RequirementValue
  building_levels_used?: number
  building_levels_capacity?: number
}

export const Requirement: React.FC<Props> = ({
  cityId,
  requirements,
  building_levels_used,
  building_levels_capacity,
}) => {
  const emptyRequirement: RequirementValue = { buildings: [], technologies: [] }
  const { isRequirementMet } = useRequirement({
    cityId,
    requirement: requirements ?? emptyRequirement,
  })

  const requirement_elements = [
    ...(requirements?.buildings ?? []).map(requirement => (
      <RequirementBuilding
        key={requirement.code}
        cityId={cityId}
        requirement={requirement}
      />
    )),
    ...(requirements?.technologies ?? []).map(requirement => (
      <RequirementTechnology
        key={requirement.code}
        requirement={requirement}
      />
    )),
  ]

  const requirement_display = requirement_elements.length ? (
    <ul className="m-0 list-none space-y-1.5 p-0">{requirement_elements}</ul>
  ) : (
    <span className="text-terminal">Aucun</span>
  )

  const has_building_levels =
    building_levels_used !== undefined &&
    building_levels_capacity !== undefined
  const levels_ok =
    !has_building_levels || building_levels_used < building_levels_capacity

  const hasUnmet =
    (!!requirements && !isRequirementMet) || (has_building_levels && !levels_ok)

  return (
    <div
      className={classNames(
        'space-y-2 rounded-sm',
        hasUnmet
          ? 'border border-danger/60 bg-danger-deep/20 p-2'
          : 'border border-transparent'
      )}
    >
      <h3 className="m-0 text-sm uppercase tracking-wider text-label">Pré-requis</h3>
      {has_building_levels && (
        <p
          className={classNames(
            'm-0 text-sm',
            levels_ok ? 'text-terminal' : 'font-semibold text-danger'
          )}
        >
          Niveaux de bâtiments (ville) {building_levels_used} / {building_levels_capacity}
        </p>
      )}
      {requirement_display}
    </div>
  )
}

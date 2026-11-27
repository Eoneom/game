import { Requirement } from '@eoneom/api-client'
import React, { useMemo } from 'react'
import classNames from 'classnames'

import { TechnologyTranslations } from '#technology/translations'
import { useListTechnologies } from '#technology/hooks'
import { RequirementLink } from '#requirement/link'

interface Props {
  cityId: string
  requirement: Requirement['technologies'][number]
}

export const RequirementTechnology: React.FC<Props> = ({ cityId, requirement }) => {
  const { data } = useListTechnologies({ cityId })
  const technologies = data?.technologies ?? []

  const requiredTechnologyLevel = useMemo(() => {
    return technologies.find(technology => technology.code === requirement.code)?.level ?? 0
  }, [technologies, requirement.code])

  const isMet = requiredTechnologyLevel >= requirement.level

  return (
    <li
      key={requirement.code}
      className={classNames(
        'rounded-sm px-2 py-1 text-body',
        isMet
          ? 'text-terminal'
          : 'border border-danger/50 bg-danger-deep/30 font-semibold text-danger'
      )}
    >
      <span className="text-caption font-normal uppercase tracking-wide text-label">Technologie</span>
      {' '}
      <RequirementLink kind="technology" code={requirement.code} cityId={cityId}>
        {TechnologyTranslations[requirement.code].name}
      </RequirementLink>
      {' '}
      <span className="whitespace-nowrap">niveau {requirement.level}</span>
      {!isMet && (
        <span className="ml-1 text-meta font-normal opacity-90">
          (actuel {requiredTechnologyLevel})
        </span>
      )}
    </li>
  )
}

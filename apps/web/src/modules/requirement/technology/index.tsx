import { Requirement } from '@eoneom/api-client'
import React, { useMemo } from 'react'
import classNames from 'classnames'

import { TechnologyTranslations } from '#technology/translations'
import { useListTechnologies } from '#technology/hooks'

interface Props {
  requirement: Requirement['technologies'][number]
}

export const RequirementTechnology: React.FC<Props> = ({ requirement }) => {
  const { data: technologies = [] } = useListTechnologies()

  const requiredTechnologyLevel = useMemo(() => {
    return technologies.find(technology => technology.code === requirement.code)?.level ?? 0
  }, [technologies, requirement.code])

  const isMet = requiredTechnologyLevel >= requirement.level

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
      {TechnologyTranslations[requirement.code].name} {requirement.level}
      {!isMet && (
        <span className="ml-1 text-xs font-normal opacity-90">
          (actuel {requiredTechnologyLevel})
        </span>
      )}
    </li>
  )
}

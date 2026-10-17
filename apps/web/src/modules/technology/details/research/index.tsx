import React from 'react'
import { RESEARCH_QUEUE_LIMIT } from '@eoneom/api-client'

import { hasEnoughResources } from '#city/helper'
import { Technology, TechnologyItem } from '#types'
import { Button } from '#ui/button'
import { useRequirement } from '#requirement/hook'
import { useGetCity } from '#city/hooks'
import { useListTechnologies, useResearchTechnology } from '#technology/hooks'

interface Props {
  cityId: string
  technology: Technology
}

export const TechnologyDetailsResearch: React.FC<Props> = ({ cityId, technology }) => {
  const { data: city } = useGetCity(cityId)
  const { data } = useListTechnologies()
  const technologies = data?.technologies ?? []
  const researchQueue = data?.research_queue ?? []
  const research = useResearchTechnology(cityId)
  const { isRequirementMet } = useRequirement({ cityId, requirement: technology.requirement })

  const inProgress = technologies.find(
    (t): t is Extract<TechnologyItem, { research_at: number }> => 'research_at' in t
  )

  const canStart = !inProgress &&
    hasEnoughResources({ city: city ?? null, cost: technology.research_cost }) &&
    isRequirementMet

  const canEnqueue = Boolean(inProgress) && researchQueue.length < RESEARCH_QUEUE_LIMIT

  const canResearch = canStart || canEnqueue

  return <Button
    disabled={!canResearch}
    onClick={() => research.mutate(technology.code)}
  >
    Rechercher
  </Button>
}

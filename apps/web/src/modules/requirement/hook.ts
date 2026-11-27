import { useCallback, useMemo } from 'react'
import { BuildingCode, Requirement, TechnologyCode } from '@eoneom/api-client'

import { useListBuildings } from '#building/hooks'
import { BuildingTranslations } from '#building/translations'
import { useListTechnologies } from '#technology/hooks'
import { TechnologyTranslations } from '#technology/translations'

export type UnmetRequirement =
  | { kind: 'building', code: BuildingCode, level: number, current: number }
  | { kind: 'technology', code: TechnologyCode, level: number, current: number }

interface Levelled<C> {
  code: C
  level: number
}

/** Requirement entries not met yet, buildings first then technologies, in requirement order. */
export const listUnmetRequirements = ({
  requirement,
  buildings,
  technologies
}: {
  requirement: Requirement
  buildings: Levelled<BuildingCode>[]
  technologies: Levelled<TechnologyCode>[]
}): UnmetRequirement[] => {
  const unmet: UnmetRequirement[] = []
  for (const required of requirement.buildings) {
    const current = buildings.find(({ code }) => code === required.code)?.level ?? 0
    if (current < required.level) {
      unmet.push({ kind: 'building', code: required.code, level: required.level, current })
    }
  }
  for (const required of requirement.technologies) {
    const current = technologies.find(({ code }) => code === required.code)?.level ?? 0
    if (current < required.level) {
      unmet.push({ kind: 'technology', code: required.code, level: required.level, current })
    }
  }
  return unmet
}

/** French name of an unmet entry (« Laboratoire de recherche »). */
export const unmetRequirementName = (unmet: UnmetRequirement): string =>
  unmet.kind === 'building'
    ? BuildingTranslations[unmet.code].name
    : TechnologyTranslations[unmet.code].name

/**
 * Evaluates requirements against the city's building list and the player's technology list
 * (both shared react-query caches, so a catalogue page requests each list once).
 */
export const useRequirementEvaluator = (cityId: string) => {
  const { data: buildingsData } = useListBuildings(cityId)
  const { data: technologiesData } = useListTechnologies({ cityId })
  const buildings = useMemo(() => buildingsData?.buildings ?? [], [buildingsData])
  const technologies = useMemo(() => technologiesData?.technologies ?? [], [technologiesData])

  return useCallback(
    (requirement: Requirement) => listUnmetRequirements({ requirement, buildings, technologies }),
    [buildings, technologies]
  )
}

export const useRequirement = ({
  cityId,
  requirement
}: {
  cityId: string
  requirement: Requirement
}) => {
  const evaluate = useRequirementEvaluator(cityId)
  const isRequirementMet = useMemo(() => evaluate(requirement).length === 0, [evaluate, requirement])

  return { isRequirementMet }
}

import { useListBuildings } from '#building/hooks'
import { useListTechnologies } from '#technology/hooks'
import { BuildingItem, TechnologyItem } from '#types'
import { Requirement } from '@eoneom/api-client'
import { useMemo } from 'react'

export const useRequirement = ({
  cityId,
  requirement
}: {
  cityId: string
  requirement: Requirement
}) => {
  const { data } = useListBuildings(cityId)
  const buildings = data?.buildings ?? []
  const { data: technologies = [] } = useListTechnologies()

  const isRequirementMet = useMemo(() => {
    return areRequirementsMet({ requirement, technologies, buildings })
  }, [requirement, technologies, buildings])

  return { isRequirementMet }
}

const areRequirementsMet = ({
  requirement,
  buildings,
  technologies
}: {
  requirement: Requirement
  buildings: BuildingItem[]
  technologies: TechnologyItem[]
}): boolean => {
  const buildingRequirementMet = requirement.buildings.every(
    r => buildings.some(({ code, level }) => r.code === code && level >= r.level)
  )
  const technologyRequirementMet = requirement.technologies.every(
    r => technologies.some(({ code, level }) => r.code === code && level >= r.level)
  )

  return buildingRequirementMet && technologyRequirementMet
}

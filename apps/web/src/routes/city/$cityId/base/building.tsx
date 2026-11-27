import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { BuildingCode } from '@eoneom/api-client'

import { BuildingPage } from '#building/page'
import { isBuildingListed } from '#building/layer'
import { pickSearchValue } from '#helpers/search'

type BuildingSearch = {
  code?: BuildingCode
}

const listed_building_codes = Object.values(BuildingCode).filter(code => isBuildingListed({ code }))

const BuildingRoute: React.FC = () => {
  const { cityId } = Route.useParams()
  const { code } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <BuildingPage
      cityId={cityId}
      selectedCode={code ?? null}
      onSelect={next => navigate({ search: { code: next }, replace: true })}
    />
  )
}

export const Route = createFileRoute('/city/$cityId/base/building')({
  validateSearch: (search: Record<string, unknown>): BuildingSearch => ({
    code: pickSearchValue(listed_building_codes, search.code),
  }),
  component: BuildingRoute,
})

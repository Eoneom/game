import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { TechnologyCode } from '@eoneom/api-client'

import { TechnologyPage } from '#technology/page'
import { pickSearchValue } from '#helpers/search'

type TechnologySearch = {
  code?: TechnologyCode
}

const TechnologyRoute: React.FC = () => {
  const { cityId } = Route.useParams()
  const { code } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <TechnologyPage
      cityId={cityId}
      selectedCode={code ?? null}
      onSelect={next => navigate({ search: { code: next }, replace: true })}
    />
  )
}

export const Route = createFileRoute('/city/$cityId/base/technology')({
  validateSearch: (search: Record<string, unknown>): TechnologySearch => ({
    code: pickSearchValue(Object.values(TechnologyCode), search.code),
  }),
  component: TechnologyRoute,
})

import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { DefenseCode } from '@eoneom/api-client'

import { DefensePage } from '#defense/page'
import { DefenseSelection } from '#defense/list'
import { pickSearchValue } from '#helpers/search'

type DefenseSearch = {
  code?: DefenseSelection
}

const defense_selections: DefenseSelection[] = [ 'city_wall', ...Object.values(DefenseCode) ]

const DefenseRoute: React.FC = () => {
  const { cityId } = Route.useParams()
  const { code } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <DefensePage
      cityId={cityId}
      selectedCode={code ?? null}
      onSelect={next => navigate({ search: { code: next }, replace: true })}
    />
  )
}

export const Route = createFileRoute('/city/$cityId/base/defense')({
  validateSearch: (search: Record<string, unknown>): DefenseSearch => ({
    code: pickSearchValue(defense_selections, search.code),
  }),
  component: DefenseRoute,
})

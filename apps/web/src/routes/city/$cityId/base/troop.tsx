import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { TroopCode } from '@eoneom/api-client'

import { TroopPage } from '#troop/page'
import { pickSearchValue } from '#helpers/search'

type TroopSearch = {
  code?: TroopCode
}

const TroopRoute: React.FC = () => {
  const { cityId } = Route.useParams()
  const { code } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <TroopPage
      cityId={cityId}
      selectedCode={code ?? null}
      onSelect={next => navigate({ search: { code: next }, replace: true })}
    />
  )
}

export const Route = createFileRoute('/city/$cityId/base/troop')({
  validateSearch: (search: Record<string, unknown>): TroopSearch => ({
    code: pickSearchValue(Object.values(TroopCode), search.code),
  }),
  component: TroopRoute,
})

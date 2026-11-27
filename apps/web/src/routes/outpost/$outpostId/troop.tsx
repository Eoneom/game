import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { TroopCode } from '@eoneom/api-client'

import { OutpostTroopPage } from '#troop/page'
import { pickSearchValue } from '#helpers/search'

type OutpostTroopSearch = {
  code?: TroopCode
}

const OutpostTroopRoute: React.FC = () => {
  const { outpostId } = Route.useParams()
  const { code } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <OutpostTroopPage
      outpostId={outpostId}
      selectedCode={code ?? null}
      onSelect={next => navigate({ search: { code: next }, replace: true })}
    />
  )
}

export const Route = createFileRoute('/outpost/$outpostId/troop')({
  validateSearch: (search: Record<string, unknown>): OutpostTroopSearch => ({
    code: pickSearchValue(Object.values(TroopCode), search.code),
  }),
  component: OutpostTroopRoute,
})

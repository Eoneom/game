import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ExchangeResource, ExchangeSide } from '@eoneom/api-client'

import { ExchangePage, type ExchangePageSearch } from '#exchange/page'
import { pickSearchValue } from '#helpers/search'

const ExchangeRoute: React.FC = () => {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  return <ExchangePage search={search} onNavigate={(next) => navigate({ search: next, replace: true })} />
}

export const Route = createFileRoute('/exchange')({
  validateSearch: (search: Record<string, unknown>): ExchangePageSearch => ({
    resource: pickSearchValue(Object.values(ExchangeResource), search.resource),
    side: pickSearchValue(Object.values(ExchangeSide), search.side),
  }),
  component: ExchangeRoute,
})

import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ExchangeResource } from '@eoneom/api-client'

import { ExchangePage, type ExchangePageSearch } from '#exchange/page'

const ExchangeRoute: React.FC = () => {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  return <ExchangePage search={search} onNavigate={(next) => navigate({ search: next })} />
}

export const Route = createFileRoute('/exchange')({
  validateSearch: (search: Record<string, unknown>): ExchangePageSearch => ({
    resource: (Object.values(ExchangeResource) as unknown[]).includes(search.resource)
      ? search.resource as ExchangeResource
      : undefined,
  }),
  component: ExchangeRoute,
})

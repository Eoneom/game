import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { RankingCategory, RankingKind } from '@eoneom/api-client'

import { RankingPage, type RankingPageSearch } from '#ranking/page'

const RankingRoute: React.FC = () => {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  return <RankingPage search={search} onNavigate={(next) => navigate({ search: next })} />
}

const isOneOf = <T extends string>(values: T[], value: unknown): value is T =>
  typeof value === 'string' && (values as string[]).includes(value)

export const Route = createFileRoute('/ranking')({
  validateSearch: (search: Record<string, unknown>): RankingPageSearch => {
    const page = Number(search.page)
    return {
      category: isOneOf(Object.values(RankingCategory), search.category) ? search.category : undefined,
      kind: isOneOf(Object.values(RankingKind), search.kind) ? search.kind : undefined,
      page: Number.isInteger(page) && page > 1 ? page : undefined,
    }
  },
  component: RankingRoute,
})

import React from 'react'
import { createFileRoute, Outlet, useChildMatches } from '@tanstack/react-router'

import { MovementPage } from '#movement/page'
import { validateMovementListSearch } from '#movement/list/sort'

const MovementRoute: React.FC = () => {
  const { cityId } = Route.useParams()
  const search = Route.useSearch()
  // `$movementId` and `send` render their own page.
  if (useChildMatches().length > 0) {
    return <Outlet />
  }
  return <MovementPage cityId={cityId} search={search} />
}

export const Route = createFileRoute('/city/$cityId/world/movement')({
  validateSearch: validateMovementListSearch,
  component: MovementRoute,
})

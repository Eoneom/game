import React from 'react'
import { createFileRoute, Outlet, useChildMatches } from '@tanstack/react-router'

import { MovementPage } from '#movement/page'
import { validateMovementListSearch } from '#movement/list/sort'

const OutpostMovementRoute: React.FC = () => {
  const { outpostId } = Route.useParams()
  const search = Route.useSearch()
  // `$movementId` and `send` render their own page.
  if (useChildMatches().length > 0) {
    return <Outlet />
  }
  return <MovementPage outpostId={outpostId} search={search} />
}

export const Route = createFileRoute('/outpost/$outpostId/world/movement')({
  validateSearch: validateMovementListSearch,
  component: OutpostMovementRoute,
})

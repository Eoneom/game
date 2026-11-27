import React from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { MovementPage } from '#movement/page'

/** List page with the movement in the details panel; keeps the list search params of the parent route. */
const OutpostMovementDetailsRoute: React.FC = () => {
  const { outpostId, movementId } = Route.useParams()
  const search = Route.useSearch()
  return <MovementPage outpostId={outpostId} movementId={movementId} search={search} />
}

export const Route = createFileRoute('/outpost/$outpostId/world/movement/$movementId')({
  component: OutpostMovementDetailsRoute,
})

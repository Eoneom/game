import React from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { MovementPage } from '#movement/page'

/** List page with the movement in the details panel; keeps the list search params of the parent route. */
const MovementDetailsRoute: React.FC = () => {
  const { cityId, movementId } = Route.useParams()
  const search = Route.useSearch()
  return <MovementPage cityId={cityId} movementId={movementId} search={search} />
}

export const Route = createFileRoute('/city/$cityId/world/movement/$movementId')({
  component: MovementDetailsRoute,
})

import React from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { MovementPage } from '#movement/page'

const MovementDetailsRoute: React.FC = () => {
  const { cityId, movementId } = Route.useParams()
  return <MovementPage cityId={cityId} movementId={movementId} />
}

export const Route = createFileRoute('/city/$cityId/world/movement/$movementId')({
  component: MovementDetailsRoute,
})

import React from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { MovementPage } from '#movement/page'

const OutpostMovementDetailsRoute: React.FC = () => {
  const { outpostId, movementId } = Route.useParams()
  return <MovementPage outpostId={outpostId} movementId={movementId} />
}

export const Route = createFileRoute('/outpost/$outpostId/world/movement/$movementId')({
  component: OutpostMovementDetailsRoute,
})

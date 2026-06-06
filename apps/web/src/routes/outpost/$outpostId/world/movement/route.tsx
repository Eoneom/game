import React from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { MovementPage } from '#movement/page'

const OutpostMovementRoute: React.FC = () => {
  const { outpostId } = Route.useParams()
  return <MovementPage outpostId={outpostId} />
}

export const Route = createFileRoute('/outpost/$outpostId/world/movement')({
  component: OutpostMovementRoute,
})

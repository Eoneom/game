import React from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { MapPage } from '#map/page'

const OutpostMapRoute: React.FC = () => {
  const { outpostId } = Route.useParams()
  return <MapPage outpostId={outpostId} />
}

export const Route = createFileRoute('/outpost/$outpostId/world/map')({
  component: OutpostMapRoute,
})

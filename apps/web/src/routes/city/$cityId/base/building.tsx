import React from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { BuildingPage } from '#building/page'

const BuildingRoute: React.FC = () => {
  const { cityId } = Route.useParams()
  return <BuildingPage cityId={cityId} />
}

export const Route = createFileRoute('/city/$cityId/base/building')({
  component: BuildingRoute,
})

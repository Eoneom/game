import React from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { MovementPage } from '#movement/page'

const MovementRoute: React.FC = () => {
  const { cityId } = Route.useParams()
  return <MovementPage cityId={cityId} />
}

export const Route = createFileRoute('/city/$cityId/world/movement')({
  component: MovementRoute,
})

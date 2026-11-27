import React from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { CityDashboard } from '#city/dashboard'

const CityBaseRoute: React.FC = () => {
  const { cityId } = Route.useParams()
  return <CityDashboard cityId={cityId} />
}

export const Route = createFileRoute('/city/$cityId/base/')({
  component: CityBaseRoute,
})

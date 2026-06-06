import React from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { TechnologyPage } from '#technology/page'

const TechnologyRoute: React.FC = () => {
  const { cityId } = Route.useParams()
  return <TechnologyPage cityId={cityId} />
}

export const Route = createFileRoute('/city/$cityId/base/technology')({
  component: TechnologyRoute,
})

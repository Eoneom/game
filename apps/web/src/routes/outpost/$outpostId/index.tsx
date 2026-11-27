import React from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { OutpostDashboard } from '#outpost/dashboard'

const OutpostRoute: React.FC = () => {
  const { outpostId } = Route.useParams()
  return <OutpostDashboard outpostId={outpostId} />
}

export const Route = createFileRoute('/outpost/$outpostId/')({
  component: OutpostRoute,
})

import React from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { SystemPlayerObservabilityPage } from '#admin/system-player-observability/page'

const AdminDashboardRoute: React.FC = () => {
  return <SystemPlayerObservabilityPage />
}

export const Route = createFileRoute('/admin/')({
  component: AdminDashboardRoute,
})

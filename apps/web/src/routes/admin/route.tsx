import React from 'react'
import { Outlet, createFileRoute } from '@tanstack/react-router'

import { AdminShell } from '#admin/layout'

const AdminRouteLayout: React.FC = () => {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  )
}

export const Route = createFileRoute('/admin')({
  component: AdminRouteLayout,
})

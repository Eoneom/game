import React from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { CombatSimulatorPage } from '#admin/combat-simulator/page'

const AdminCombatSimulatorRoute: React.FC = () => {
  return <CombatSimulatorPage />
}

export const Route = createFileRoute('/admin/combat-simulator')({
  component: AdminCombatSimulatorRoute,
})

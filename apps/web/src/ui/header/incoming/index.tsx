import React from 'react'
import { Link } from '@tanstack/react-router'

import { useListIncomingMovements } from '#troop/hooks'

interface Props {
  cityId?: string
  outpostId?: string
}

/** Incoming attack count (slice 030), linking to the « Entrants » tab (slice 045); hidden below detection 1. */
export const HeaderIncomingAttacks: React.FC<Props> = ({ cityId, outpostId }) => {
  const { data: movements = [] } = useListIncomingMovements()

  if (!movements.length) {
    return null
  }

  const RouterLink = Link as React.ComponentType<{
    to: string
    params?: Record<string, string>
    search?: Record<string, string>
    className?: string
    title?: string
    children: React.ReactNode
  }>

  const label = `${movements.length} attaque${movements.length > 1 ? 's' : ''} entrante${movements.length > 1 ? 's' : ''}`
  const className = 'inline-block shrink-0 rounded-sm border border-danger bg-danger-deep/50 px-2 py-0.5 text-caption uppercase tracking-wide text-amber'

  if (cityId) {
    return (
      <RouterLink to="/city/$cityId/world/movement" params={{ cityId }} search={{ tab: 'entrants' }} className={className} title="Attaques entrantes">
        {label}
      </RouterLink>
    )
  }

  if (outpostId) {
    return (
      <RouterLink to="/outpost/$outpostId/world/movement" params={{ outpostId }} search={{ tab: 'entrants' }} className={className} title="Attaques entrantes">
        {label}
      </RouterLink>
    )
  }

  return <span className={className}>{label}</span>
}

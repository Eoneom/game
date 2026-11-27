import React from 'react'
import { Link } from '@tanstack/react-router'
import { TroopIncomingMovement } from '@eoneom/api-client'

import { useGetMovement } from '#troop/hooks'
import { MovementDetails } from '#movement/details'
import { IncomingMovementDetails } from '#movement/incoming/details'
import { MovementOrigin, movementListPath } from '#movement/navigation'

const AnyLink = Link as React.ComponentType<{
  to: string
  className?: string
  children: React.ReactNode
}>

interface Props {
  origin: MovementOrigin
  movementId: string
  source: 'own' | 'incoming'
  /** Cached `GET /troop/movement/incoming` rows (incoming arrows and rings). */
  incoming: TroopIncomingMovement[] | undefined
}

/** Clicked arrow in the drawer (slice 044): own movement details or the incoming attack card. */
export const MapDrawerMovement: React.FC<Props> = ({ origin, movementId, source, incoming }) => {
  const isOwn = source === 'own'
  const { data: movement, isPending, isError } = useGetMovement(isOwn ? movementId : null)

  if (!isOwn) {
    const attack = incoming?.find(entry => entry.id === movementId)
    if (!attack) return <p className="text-body text-label">Cette attaque est arrivée.</p>
    return <IncomingMovementDetails movement={attack} />
  }

  if (isPending) return <p className="text-body text-label">Chargement du mouvement…</p>
  if (isError || !movement) return <p className="text-body text-label">Ce mouvement est arrivé.</p>

  return (
    <div className="space-y-3">
      <MovementDetails movement={movement} />
      <AnyLink to={`${movementListPath(origin)}/${movementId}`} className="text-meta">Ouvrir dans Mouvements</AnyLink>
    </div>
  )
}

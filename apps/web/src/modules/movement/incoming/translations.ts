import type { TroopIncomingMovement } from '@eoneom/api-client'

import { formatCoordinates } from '#helpers/transform'

const IncomingTargetKindLabels: Record<TroopIncomingMovement['target']['kind'], string> = {
  city: 'Ville',
  outpost: 'Avant-poste',
  field: 'Troupes en campagne',
}

/** "Ville Bastion (3.4)", "Avant-poste (5.6)"… */
export const formatIncomingTarget = (target: TroopIncomingMovement['target']): string => {
  const label = target.name
    ? `${IncomingTargetKindLabels[target.kind]} ${target.name}`
    : IncomingTargetKindLabels[target.kind]
  return `${label} (${formatCoordinates(target.coordinates)})`
}

/** Army size as revealed at detection 3 (rounded to the nearest 10). */
export const formatIncomingUnitCount = (unit_count: number): string =>
  `≈ ${unit_count} unité${unit_count > 1 ? 's' : ''}`

import React from 'react'

import { formatSpySuccessPreview, spySuccessPreview } from '#movement/spy'
import { ESPIONAGE_REQUIRED } from '#movement/send/actions'

interface Props {
  espionageLevel: number
  scoutCount: number
}

/** Spy odds preview (slice 030): own Espionnage is known, the target's Détection is not. */
export const MovementSendSpyPreview: React.FC<Props> = ({ espionageLevel, scoutCount }) => {
  if (espionageLevel < 1) {
    return <p className="m-0 text-body text-danger">{ESPIONAGE_REQUIRED}</p>
  }

  return (
    <p className="m-0 text-body text-amber-dim">
      Chances de succès :{' '}
      <span className="font-mono text-amber">
        {formatSpySuccessPreview(spySuccessPreview({ espionage_level: espionageLevel, scout_count: scoutCount }))}
      </span>
    </p>
  )
}

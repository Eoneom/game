import React from 'react'

import { formatSpySuccessPreview, spySuccessPreview } from '#movement/spy'

interface Props {
  espionageLevel: number
  scoutCount: number
}

/** Spy odds preview (slice 030): own Espionnage is known, the target's Détection is not. */
export const MovementCreateSpyPreview: React.FC<Props> = ({ espionageLevel, scoutCount }) => {
  if (espionageLevel < 1) {
    return (
      <p className="m-0 text-body text-danger">
        Recherchez l&apos;Espionnage pour envoyer des espions.
      </p>
    )
  }

  return (
    <div className="space-y-1 text-body text-amber-dim">
      <p className="m-0">
        Chances de succès :{' '}
        <span className="font-mono text-amber">
          {formatSpySuccessPreview(spySuccessPreview({ espionage_level: espionageLevel, scout_count: scoutCount }))}
        </span>
      </p>
      <p className="m-0 text-meta text-label">
        En cas d&apos;échec, tous les éclaireurs envoyés sont détruits et la cible est prévenue.
      </p>
    </div>
  )
}

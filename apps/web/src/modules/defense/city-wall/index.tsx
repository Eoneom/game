import React from 'react'
import { DefenseListDataResponse } from '@eoneom/api-client'

import { freeDefensePoints } from '#defense/capacity'

interface Props {
  defenses?: DefenseListDataResponse
}

/** Defense points used / queued / total of the Enceinte, shown on its wide card (slice 043). */
export const DefenseCityWallCapacity: React.FC<Props> = ({ defenses }) => {
  const level = defenses?.city_wall_level ?? 0
  const capacity = defenses?.capacity ?? { total: 0, used: 0, queued: 0 }
  const fill = capacity.total > 0
    ? Math.min(100, ((capacity.used + capacity.queued) / capacity.total) * 100)
    : 0

  return (
    <div className="space-y-1">
      <p className="m-0 text-meta text-amber-dim">
        Points de défense : <span className="font-mono text-amber">{capacity.used}</span>
        {capacity.queued > 0 ? <> (+{capacity.queued} en construction)</> : null}
        {' '}/ <span className="font-mono text-amber">{capacity.total}</span>
        {' · '}libres : <span className="font-mono text-amber">{freeDefensePoints(capacity)}</span>
      </p>
      <div className="h-1.5 w-full max-w-md overflow-hidden rounded-sm bg-chrome" aria-hidden>
        <div className="h-full bg-amber/70" style={{ width: `${fill}%` }} />
      </div>
      {level === 0 ? (
        <p className="m-0 text-meta text-amber-dim">Construisez l&apos;enceinte pour ériger des défenses.</p>
      ) : null}
    </div>
  )
}

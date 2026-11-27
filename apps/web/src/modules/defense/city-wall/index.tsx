import React from 'react'
import { BuildingCode, DefenseListDataResponse } from '@eoneom/api-client'

import { BuildingTranslations } from '#building/translations'
import { buildingImageSrc } from '#building/image'
import { freeDefensePoints } from '#defense/capacity'
import { Button } from '#ui/button'
import { EntityThumb } from '#ui/entity-thumb'

interface Props {
  defenses?: DefenseListDataResponse
  active: boolean
  onSelect: () => void
}

/** Enceinte card: level, defense points used / total, link to its upgrade details. */
export const DefenseCityWallCard: React.FC<Props> = ({ defenses, active, onSelect }) => {
  const level = defenses?.city_wall_level ?? 0
  const capacity = defenses?.capacity ?? { total: 0, used: 0, queued: 0 }
  const fill = capacity.total > 0
    ? Math.min(100, ((capacity.used + capacity.queued) / capacity.total) * 100)
    : 0

  return (
    <section
      className={`surface-panel mb-3 p-3 ${active ? 'border-amber/60' : 'border-rust/60'}`}
    >
      <div className="flex gap-3">
        <EntityThumb size="md" src={buildingImageSrc(BuildingCode.CITY_WALL)} alt="" />
        <div className="min-w-0 flex-1 space-y-2">
          <header className="flex items-baseline justify-between gap-2">
            <h2 className="m-0 text-heading text-amber">{BuildingTranslations[BuildingCode.CITY_WALL].name}</h2>
            <span className="font-mono text-caption text-label">niveau {level}</span>
          </header>
          <p className="m-0 text-body text-amber-dim">
            Points de défense : <span className="font-mono text-amber">{capacity.used}</span>
            {capacity.queued > 0 ? <> (+{capacity.queued} en construction)</> : null}
            {' '}/ <span className="font-mono text-amber">{capacity.total}</span>
            {' · '}libres : <span className="font-mono text-amber">{freeDefensePoints(capacity)}</span>
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-sm bg-chrome-2" aria-hidden>
            <div className="h-full bg-amber/70" style={{ width: `${fill}%` }} />
          </div>
          {level === 0 ? (
            <p className="m-0 text-meta text-amber-dim">Construisez l&apos;enceinte pour ériger des défenses.</p>
          ) : null}
          <Button variant="ghost" className="!px-2 !py-1" onClick={onSelect}>
            {level === 0 ? 'Construire l\'enceinte' : 'Améliorer l\'enceinte'}
          </Button>
        </div>
      </div>
    </section>
  )
}

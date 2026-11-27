import React, { useState } from 'react'
import { DefenseListEntry } from '@eoneom/api-client'

import { DefenseTranslations } from '#defense/translations'
import { defenseImageSrc } from '#defense/image'
import { maxBuildableCount } from '#defense/capacity'
import { useBuildDefense, useCityDefenses } from '#defense/hooks'
import { Requirement } from '#requirement/index'
import { useRequirement } from '#requirement/hook'
import { Cost } from '#cost/index'
import { hasEnoughResources } from '#city/helper'
import { useGetCity } from '#city/hooks'
import { Button } from '#ui/button'
import { EntityThumb } from '#ui/entity-thumb'
import { LayoutDetailsContent } from '#ui/layout/details/content'

interface Props {
  cityId: string
  defense: DefenseListEntry
}

export const DefenseDetails: React.FC<Props> = ({ cityId, defense }) => {
  const { data: city } = useGetCity(cityId)
  const { data } = useCityDefenses(cityId)
  const build = useBuildDefense(cityId)
  const [count, setCount] = useState(1)
  const { isRequirementMet } = useRequirement({ cityId, requirement: defense.requirement })

  const { name, description, effect } = DefenseTranslations[defense.code]
  const capacity = data?.capacity ?? { total: 0, used: 0, queued: 0 }
  const maxCount = maxBuildableCount({ capacity, points: defense.points })
  const ongoing = data?.ongoing_build ?? null
  const queueLimit = data?.build_queue_limit ?? 0
  const canEnqueue = Boolean(ongoing) && (data?.build_queue.length ?? 0) < queueLimit
  const cost = {
    plastic: count * defense.cost.plastic,
    mushroom: count * defense.cost.mushroom,
    plasma: count * defense.cost.plasma,
  }
  const fits = count >= 1 && count <= maxCount
  const canStart = !ongoing && fits && isRequirementMet && hasEnoughResources({ city: city ?? null, cost })
  const canBuild = ongoing ? canEnqueue && fits : canStart

  return <>
    <LayoutDetailsContent>
      <div className="flex gap-4">
        <EntityThumb src={defenseImageSrc(defense.code)} alt={name} />
        <div className="min-w-0 flex-1 space-y-2">
          <h2>{name}</h2>
          <p>{effect}</p>
        </div>
      </div>

      <ul className="m-0 grid list-none grid-cols-2 gap-1 p-0 text-sm text-amber-dim sm:grid-cols-4">
        <li>Attaque <span className="font-mono text-amber">{defense.attack}</span></li>
        <li>Vie <span className="font-mono text-amber">{defense.life || '—'}</span></li>
        <li>Points <span className="font-mono text-amber">{defense.points}</span></li>
        <li>{defense.armed ? 'Armée' : 'Non armée'}</li>
      </ul>
      <p className="m-0 text-sm text-amber-dim">
        Dans la ville : <span className="font-mono text-amber">{defense.count}</span>
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[7rem] flex-col gap-1">
          <span className="field-label">Quantité (max {maxCount})</span>
          <input
            type="number"
            className="field-input field-input--number w-28"
            value={count}
            min={1}
            max={Math.max(1, maxCount)}
            onChange={event => {
              const value = Number.parseInt(event.target.value, 10)
              setCount(Number.isNaN(value) || value <= 0 ? 1 : value)
            }}
          />
        </label>
        <Button
          disabled={!canBuild}
          onClick={() => {
            build.mutate({ code: defense.code, count })
            setCount(1)
          }}
        >
          {ongoing ? 'Ajouter à la file' : 'Construire'}
        </Button>
      </div>
      {maxCount === 0 ? (
        <p className="m-0 text-xs text-amber-dim">Capacité de l&apos;enceinte atteinte : améliorez l&apos;enceinte.</p>
      ) : null}
      <p className="description">{description}</p>
    </LayoutDetailsContent>

    <aside className="mt-4 space-y-3 border-t border-rust/50 pt-3">
      <Requirement cityId={cityId} requirements={defense.requirement} />
      <Cost
        cityId={cityId}
        plastic={cost.plastic}
        mushroom={cost.mushroom}
        plasma={cost.plasma}
        duration={count * defense.cost.duration}
      />
    </aside>
  </>
}

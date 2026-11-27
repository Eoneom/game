import React, { useState } from 'react'
import { BuildingCode, DefenseCode } from '@eoneom/api-client'

import { BuildingDetails } from '#building/details'
import { useGetBuilding } from '#building/hooks'
import { DefenseCityWallCard } from '#defense/city-wall'
import { DefenseBuildQueue } from '#defense/queue'
import { DefenseList } from '#defense/list'
import { DefenseDetails } from '#defense/details'
import { useCityDefenses } from '#defense/hooks'
import { LayoutPage } from '#ui/layout/page'
import { LayoutDetailsEmpty } from '#ui/layout/details/empty'
import { Building } from '#types'

interface Props {
  cityId: string
}

type Selection = { kind: 'city_wall' } | { kind: 'defense', code: DefenseCode } | null

/** Défense tab (slice 029): Enceinte, fortification queue and defense catalogue. */
export const DefensePage: React.FC<Props> = ({ cityId }) => {
  const [selection, setSelection] = useState<Selection>(null)
  const { data } = useCityDefenses(cityId)
  const { data: cityWall, isFetching } = useGetBuilding(
    cityId,
    selection?.kind === 'city_wall' ? BuildingCode.CITY_WALL : null
  )

  const selectedDefense = selection?.kind === 'defense'
    ? data?.defenses.find(defense => defense.code === selection.code)
    : undefined

  const details = selection?.kind === 'city_wall'
    ? cityWall
      ? <BuildingDetails cityId={cityId} building={cityWall as Building} />
      : isFetching ? <LayoutDetailsEmpty>Chargement de l&apos;enceinte…</LayoutDetailsEmpty> : null
    : selectedDefense
      ? <DefenseDetails key={selectedDefense.code} cityId={cityId} defense={selectedDefense} />
      : (
        <LayoutDetailsEmpty>
          Sélectionnez une défense ou l&apos;enceinte pour afficher ses détails.
        </LayoutDetailsEmpty>
      )

  return (
    <LayoutPage details={details}>
      <DefenseCityWallCard
        defenses={data}
        active={selection?.kind === 'city_wall'}
        onSelect={() => setSelection({ kind: 'city_wall' })}
      />
      <DefenseList
        cityId={cityId}
        selectedCode={selection?.kind === 'defense' ? selection.code : null}
        onSelect={code => setSelection({ kind: 'defense', code })}
        inProgress={<DefenseBuildQueue cityId={cityId} />}
      />
    </LayoutPage>
  )
}

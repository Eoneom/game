import React from 'react'
import { BuildingCode } from '@eoneom/api-client'

import { BuildingDetails } from '#building/details'
import { useGetBuilding } from '#building/hooks'
import { DefenseList, DefenseSelection } from '#defense/list'
import { DefenseDetails } from '#defense/details'
import { useCityDefenses } from '#defense/hooks'
import { LayoutPage } from '#ui/layout/page'
import { LayoutDetailsEmpty } from '#ui/layout/details/empty'
import { Building } from '#types'

interface Props {
  cityId: string
  selectedCode: DefenseSelection | null
  onSelect: (code: DefenseSelection) => void
}

/** Défense tab (slices 029 / 043): fortification queue, Enceinte and defense catalogue. */
export const DefensePage: React.FC<Props> = ({ cityId, selectedCode, onSelect }) => {
  const { data } = useCityDefenses(cityId)
  const { data: cityWall, isFetching } = useGetBuilding(
    cityId,
    selectedCode === 'city_wall' ? BuildingCode.CITY_WALL : null
  )

  const selectedDefense = selectedCode && selectedCode !== 'city_wall'
    ? data?.defenses.find(defense => defense.code === selectedCode)
    : undefined

  const details = selectedCode === 'city_wall'
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
      <DefenseList
        cityId={cityId}
        selectedCode={selectedCode}
        onSelect={onSelect}
      />
    </LayoutPage>
  )
}

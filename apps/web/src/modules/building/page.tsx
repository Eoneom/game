import React from 'react'
import { BuildingCode } from '@eoneom/api-client'

import { BuildingList } from '#building/list'
import { BuildingDetails } from '#building/details'
import { LayoutPage } from '#ui/layout/page'
import { LayoutDetailsEmpty } from '#ui/layout/details/empty'
import { useGetBuilding } from '#building/hooks'
import { Building } from '#types'

interface Props {
  cityId: string
  /** Selected building from the URL (`?code=`, slice 043). */
  selectedCode: BuildingCode | null
  onSelect: (code: BuildingCode) => void
}

export const BuildingPage: React.FC<Props> = ({ cityId, selectedCode, onSelect }) => {
  const { data: building, isFetching } = useGetBuilding(cityId, selectedCode)

  const details = building ? (
    <BuildingDetails cityId={cityId} building={building as Building} />
  ) : selectedCode && isFetching ? (
    <LayoutDetailsEmpty>Chargement du bâtiment…</LayoutDetailsEmpty>
  ) : (
    <LayoutDetailsEmpty>
      Sélectionnez un bâtiment pour afficher ses détails.
    </LayoutDetailsEmpty>
  )

  return (
    <LayoutPage details={details}>
      <BuildingList
        cityId={cityId}
        selectedCode={selectedCode}
        onSelect={onSelect}
      />
    </LayoutPage>
  )
}

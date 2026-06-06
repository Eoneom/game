import React, { useState } from 'react'
import { BuildingCode } from '@eoneom/api-client'

import { BuildingList } from '#building/list'
import { BuildingDetails } from '#building/details'
import { LayoutPage } from '#ui/layout/page'
import { LayoutDetailsEmpty } from '#ui/layout/details/empty'
import { useGetBuilding } from '#building/hooks'
import { Building } from '#types'

interface Props {
  cityId: string
}

export const BuildingPage: React.FC<Props> = ({ cityId }) => {
  const [selectedCode, setSelectedCode] = useState<BuildingCode | null>(null)
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
        onSelect={setSelectedCode}
      />
    </LayoutPage>
  )
}

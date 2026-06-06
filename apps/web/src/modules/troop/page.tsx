import React, { useState } from 'react'

import { LayoutPage } from '#ui/layout/page'
import { LayoutDetailsEmpty } from '#ui/layout/details/empty'
import { TroopList } from '#troop/list'
import { TroopDetails } from '#troop/details'
import { useGetTroop } from '#troop/hooks'
import { Troop } from '#types'

interface Props {
  cityId: string
}

export const TroopPage: React.FC<Props> = ({ cityId }) => {
  const [selectedTroopId, setSelectedTroopId] = useState<string | null>(null)
  const { data: troop, isFetching } = useGetTroop(selectedTroopId)

  const details = troop ? (
    <TroopDetails cityId={cityId} troop={troop as Troop} />
  ) : selectedTroopId && isFetching ? (
    <LayoutDetailsEmpty>Chargement de l&apos;unité…</LayoutDetailsEmpty>
  ) : (
    <LayoutDetailsEmpty>
      Sélectionnez une unité pour afficher ses détails.
    </LayoutDetailsEmpty>
  )

  return (
    <LayoutPage details={details}>
      <TroopList
        cityId={cityId}
        selectedTroopId={selectedTroopId}
        onSelect={setSelectedTroopId}
      />
    </LayoutPage>
  )
}

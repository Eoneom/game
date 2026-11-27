import React, { useState } from 'react'

import { LayoutPage } from '#ui/layout/page'
import { LayoutDetailsEmpty } from '#ui/layout/details/empty'
import { TroopList } from '#troop/list'
import { TroopDetails } from '#troop/details'
import { useGetTroop } from '#troop/hooks'
import { Troop } from '#types'
import { useGetCity, useSetCityCombatStrategy } from '#city/hooks'
import { GarrisonCombatStrategy } from '#troop/garrison-strategy'
import { ReinforcementsAbroad, StationedReinforcements } from '#alliance/reinforcements'

interface Props {
  cityId: string
}

export const TroopPage: React.FC<Props> = ({ cityId }) => {
  const [selectedTroopId, setSelectedTroopId] = useState<string | null>(null)
  const { data: troop, isFetching } = useGetTroop(selectedTroopId)
  const { data: city } = useGetCity(cityId)
  const setCombatStrategy = useSetCityCombatStrategy(cityId)

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
      <div className="space-y-4">
        {city && city.id === cityId && (
          <GarrisonCombatStrategy
            strategy={city.default_combat_strategy}
            pending={setCombatStrategy.isPending}
            onChange={strategy => setCombatStrategy.mutate(strategy)}
          />
        )}
        <TroopList
          cityId={cityId}
          selectedTroopId={selectedTroopId}
          onSelect={setSelectedTroopId}
        />
        <StationedReinforcements cityId={cityId} />
        <ReinforcementsAbroad cityId={cityId} />
      </div>
    </LayoutPage>
  )
}

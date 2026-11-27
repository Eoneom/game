import React from 'react'
import { TroopCode } from '@eoneom/api-client'

import { LayoutPage } from '#ui/layout/page'
import { LayoutDetailsEmpty } from '#ui/layout/details/empty'
import { OutpostTroopList, TroopList } from '#troop/list'
import { TroopDetails } from '#troop/details'
import { useGetTroop, useListCityTroops, useListOutpostTroops } from '#troop/hooks'
import { Troop } from '#types'
import { useGetCity, useSetCityCombatStrategy } from '#city/hooks'
import { useGetOutpost, useSetOutpostCombatStrategy } from '#outpost/hooks'
import { GarrisonCombatStrategy } from '#troop/garrison-strategy'
import { ReinforcementsAbroad, StationedReinforcements } from '#alliance/reinforcements'

interface SelectionProps {
  selectedCode: TroopCode | null
  onSelect: (code: TroopCode) => void
}

const troopDetailsPanel = (
  troop: Troop | undefined,
  loading: boolean,
  render: (troop: Troop) => React.ReactNode
): React.ReactNode => troop ? render(troop) : loading ? (
  <LayoutDetailsEmpty>Chargement de l&apos;unité…</LayoutDetailsEmpty>
) : (
  <LayoutDetailsEmpty>
    Sélectionnez une unité pour afficher ses détails.
  </LayoutDetailsEmpty>
)

/** City troop page (slice 043): `?code=` selects a troop code, resolved to its row id for the details. */
export const TroopPage: React.FC<{ cityId: string } & SelectionProps> = ({ cityId, selectedCode, onSelect }) => {
  const { data: troops = [] } = useListCityTroops(cityId)
  const selectedTroopId = troops.find(troop => troop.code === selectedCode)?.id ?? null
  const { data: troop, isFetching } = useGetTroop(selectedTroopId)
  const { data: city } = useGetCity(cityId)
  const setCombatStrategy = useSetCityCombatStrategy(cityId)

  const details = troopDetailsPanel(
    troop as Troop | undefined,
    Boolean(selectedTroopId) && isFetching,
    value => <TroopDetails cityId={cityId} troop={value} />
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
          selectedCode={selectedCode}
          onSelect={onSelect}
        />
        <StationedReinforcements cityId={cityId} />
        <ReinforcementsAbroad cityId={cityId} />
      </div>
    </LayoutPage>
  )
}

/** Read-only troop page of an outpost (slice 043): garrison strategy, troop grid and details. */
export const OutpostTroopPage: React.FC<{ outpostId: string } & SelectionProps> = ({
  outpostId,
  selectedCode,
  onSelect,
}) => {
  const { data: troops = [] } = useListOutpostTroops(outpostId)
  const selectedTroopId = troops.find(troop => troop.code === selectedCode)?.id ?? null
  const { data: troop, isFetching } = useGetTroop(selectedTroopId)
  const { data: outpost } = useGetOutpost(outpostId)
  const setCombatStrategy = useSetOutpostCombatStrategy(outpostId)

  const details = troopDetailsPanel(
    troop as Troop | undefined,
    Boolean(selectedTroopId) && isFetching,
    value => <TroopDetails troop={value} readOnly />
  )

  return (
    <LayoutPage details={details}>
      <div className="space-y-4">
        {outpost && outpost.id === outpostId && (
          <GarrisonCombatStrategy
            strategy={outpost.default_combat_strategy}
            pending={setCombatStrategy.isPending}
            onChange={strategy => setCombatStrategy.mutate(strategy)}
          />
        )}
        <OutpostTroopList
          outpostId={outpostId}
          selectedCode={selectedCode}
          onSelect={onSelect}
        />
      </div>
    </LayoutPage>
  )
}

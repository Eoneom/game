import React, { useMemo } from 'react'

import { TroopListItem } from '#troop/list/item'
import { TroopListInProgress } from '#troop/list/in-progress'
import { List } from '#ui/list'
import { useListCityTroops } from '#troop/hooks'

interface Props {
  cityId: string
  selectedTroopId: string | null
  onSelect: (id: string) => void
}

export const TroopList: React.FC<Props> = ({ cityId, selectedTroopId, onSelect }) => {
  const { data: troops = [] } = useListCityTroops(cityId)

  const recruitingId = useMemo(
    () => troops.find(t => t.ongoing_recruitment)?.id,
    [troops]
  )

  const items = useMemo(() => {
    return troops.map(troop => (
      <TroopListItem
        active={selectedTroopId === troop.id}
        key={troop.id}
        troop={troop}
        onSelect={onSelect}
        badge={troop.id === recruitingId ? 'En cours' : undefined}
        busy={troop.id === recruitingId}
      />
    ))
  }, [selectedTroopId, troops, onSelect, recruitingId])

  return <List
    inProgress={<TroopListInProgress cityId={cityId} />}
    items={items}
  />
}

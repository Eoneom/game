import React, { useMemo } from 'react'
import { BuildingCode } from '@eoneom/api-client'

import { BuildingListItem } from '#building/list/item'
import { BuildingTranslations } from '#building/translations'
import { Button } from '#ui/button'
import { CountdownProgress } from '#ui/countdown-progress'
import { List } from '#ui/list'
import { useCountdownProgress } from '#hook/countdown-progress'
import { useListBuildings, useCancelBuildingUpgrade } from '#building/hooks'
import { BuildingItem } from '#types'

interface Props {
  cityId: string
  selectedCode: BuildingCode | null
  onSelect: (code: BuildingCode) => void
}

export const BuildingList: React.FC<Props> = ({ cityId, selectedCode, onSelect }) => {
  const { data: buildings = [] } = useListBuildings(cityId)
  const cancelUpgrade = useCancelBuildingUpgrade(cityId)

  const inProgress = buildings.find(
    (b): b is Extract<BuildingItem, { upgrade_at: number }> => 'upgrade_at' in b
  )

  const { remainingSeconds, elapsedProgress, reset } = useCountdownProgress({
    onDone: () => undefined,
    endAt: inProgress?.upgrade_at,
    startAt: inProgress?.upgrade_started_at
  })

  const handleCancel = () => {
    cancelUpgrade.mutate()
    reset()
  }

  const inProgressComponent = inProgress && <>
    <CountdownProgress
      summary={<>En cours: {BuildingTranslations[inProgress.code].name}</>}
      elapsedProgress={elapsedProgress}
      remainingSeconds={remainingSeconds}
    />
    <Button onClick={handleCancel}>Annuler</Button>
  </>

  const items = useMemo(() => buildings.map(buildingItem =>
    <BuildingListItem
      active={buildingItem.code === selectedCode}
      key={buildingItem.id}
      buildingItem={buildingItem}
      onSelect={onSelect}
    />
  ), [selectedCode, buildings, onSelect])

  return <List
    inProgress={inProgressComponent}
    items={items}
  />
}

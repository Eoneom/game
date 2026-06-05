import React, { useMemo } from 'react'
import {
  BuildingCode,
  BUILDING_UPGRADE_QUEUE_LIMIT
} from '@eoneom/api-client'

import { BuildingListItem } from '#building/list/item'
import { projectUpgradeQueueLevels } from '#building/queue-levels'
import { BuildingTranslations } from '#building/translations'
import { Button } from '#ui/button'
import { CountdownProgress } from '#ui/countdown-progress'
import { List } from '#ui/list'
import { useCountdownProgress } from '#hook/countdown-progress'
import {
  useListBuildings,
  useCancelBuildingUpgrade,
  useCancelQueuedBuildingUpgrade
} from '#building/hooks'
import { BuildingItem } from '#types'

interface Props {
  cityId: string
  selectedCode: BuildingCode | null
  onSelect: (code: BuildingCode) => void
}

export const BuildingList: React.FC<Props> = ({ cityId, selectedCode, onSelect }) => {
  const { data } = useListBuildings(cityId)
  const buildings = data?.buildings ?? []
  const upgradeQueue = data?.upgrade_queue ?? []
  const cancelUpgrade = useCancelBuildingUpgrade(cityId)
  const cancelQueued = useCancelQueuedBuildingUpgrade(cityId)

  const inProgress = buildings.find(
    (b): b is Extract<BuildingItem, { upgrade_at: number }> => 'upgrade_at' in b
  )

  const queuedWithLevels = useMemo(
    () => projectUpgradeQueueLevels({
      buildings,
      upgrade_queue: upgradeQueue
    }),
    [buildings, upgradeQueue]
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

  const showQueueSection = Boolean(inProgress) || upgradeQueue.length > 0

  const inProgressComponent = <>
    {inProgress && <>
      <CountdownProgress
        summary={<>En cours: {BuildingTranslations[inProgress.code].name} niveau {inProgress.level + 1}</>}
        elapsedProgress={elapsedProgress}
        remainingSeconds={remainingSeconds}
      />
      <Button onClick={handleCancel}>Annuler</Button>
    </>}
    {showQueueSection && (
      <>
        <div>File d&apos;attente: {upgradeQueue.length}/{BUILDING_UPGRADE_QUEUE_LIMIT}</div>
        {queuedWithLevels.length > 0 && (
          <ul>
            {queuedWithLevels.map(item => (
              <li key={item.id}>
                File: {BuildingTranslations[item.building_code].name} niveau {item.level}{' '}
                <Button onClick={() => cancelQueued.mutate(item.id)}>Annuler</Button>
              </li>
            ))}
          </ul>
        )}
      </>
    )}
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
    inProgress={showQueueSection ? inProgressComponent : undefined}
    items={items}
  />
}

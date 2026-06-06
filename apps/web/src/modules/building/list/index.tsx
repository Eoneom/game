import React, { useMemo } from 'react'
import {
  BuildingCode,
  BUILDING_UPGRADE_QUEUE_LIMIT
} from '@eoneom/api-client'

import { BuildingListItem } from '#building/list/item'
import { projectUpgradeQueueLevels } from '#building/queue-levels'
import { BuildingTranslations } from '#building/translations'
import { buildingImageSrc } from '#building/image'
import { Button } from '#ui/button'
import { CountdownProgress } from '#ui/countdown-progress'
import { EntityThumb } from '#ui/entity-thumb'
import { List } from '#ui/list'
import { QueuePanel } from '#ui/queue-panel'
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

  const queuedCodes = useMemo(
    () => new Set(upgradeQueue.map(item => item.building_code)),
    [upgradeQueue]
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

  const queueDepth = `${upgradeQueue.length}/${BUILDING_UPGRADE_QUEUE_LIMIT}`

  const inProgressComponent = (
    <QueuePanel
      title="Construction"
      depth={queueDepth}
      empty={!inProgress ? 'Aucune construction en cours' : undefined}
      active={inProgress ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <EntityThumb
            size="md"
            src={buildingImageSrc(inProgress.code)}
            alt=""
          />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="m-0 text-sm text-amber">
              {BuildingTranslations[inProgress.code].name}{' '}
              <span className="text-label">→ niveau {inProgress.level + 1}</span>
            </p>
            <CountdownProgress
              summary={<>Construction en cours</>}
              elapsedProgress={elapsedProgress}
              remainingSeconds={remainingSeconds}
            />
            <Button variant="danger" onClick={handleCancel}>Annuler</Button>
          </div>
        </div>
      ) : undefined}
      queue={queuedWithLevels.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {queuedWithLevels.map(item => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-sm border border-rust/40 bg-chrome/50 px-2 py-1.5 text-sm"
            >
              <span className="min-w-0 text-amber-dim">
                {BuildingTranslations[item.building_code].name}{' '}
                <span className="text-label">niveau {item.level}</span>
              </span>
              <Button
                variant="ghost"
                className="shrink-0 !px-2 !py-1 text-xs"
                onClick={() => cancelQueued.mutate(item.id)}
              >
                Annuler
              </Button>
            </li>
          ))}
        </ul>
      ) : undefined}
    />
  )

  const items = useMemo(() => buildings.map(buildingItem => {
    const isUpgrading = inProgress?.code === buildingItem.code
    const isQueued = queuedCodes.has(buildingItem.code)
    return (
      <BuildingListItem
        active={buildingItem.code === selectedCode}
        key={buildingItem.id}
        buildingItem={buildingItem}
        onSelect={onSelect}
        badge={isUpgrading ? 'En cours' : isQueued ? 'File' : undefined}
        busy={isUpgrading || isQueued}
      />
    )
  }), [selectedCode, buildings, onSelect, inProgress, queuedCodes])

  return <List
    inProgress={inProgressComponent}
    items={items}
  />
}

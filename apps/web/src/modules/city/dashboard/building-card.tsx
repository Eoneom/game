import React, { useMemo } from 'react'
import { BUILDING_UPGRADE_QUEUE_LIMIT } from '@eoneom/api-client'

import { buildingKeys, useListBuildings } from '#building/hooks'
import { projectUpgradeQueueLevels } from '#building/queue-levels'
import { BuildingTranslations } from '#building/translations'
import { queryCardState } from '#location/dashboard/card'
import { useCountdownRefetch } from '#location/dashboard/refetch'
import { BuildingItem } from '#types'
import { DashboardQueueCard } from '#city/dashboard/queue-card'

/** « Construction » (slice 042): the city's building upgrade and its waiting rows. */
export const BuildingQueueCard: React.FC<{ cityId: string }> = ({ cityId }) => {
  const query = useListBuildings(cityId)
  const refetch = useCountdownRefetch(buildingKeys.list(cityId))
  const buildings = query.data?.buildings
  const upgradeQueue = query.data?.upgrade_queue

  const inProgress = buildings?.find(
    (building): building is Extract<BuildingItem, { upgrade_at: number }> => 'upgrade_at' in building
  )
  const waiting = useMemo(
    () => projectUpgradeQueueLevels({ buildings: buildings ?? [], upgrade_queue: upgradeQueue ?? [] }),
    [ buildings, upgradeQueue ]
  )

  return (
    <DashboardQueueCard
      title="Construction"
      to="/city/$cityId/base/building"
      params={{ cityId }}
      state={queryCardState(query)}
      onRetry={() => void query.refetch()}
      onJobDone={refetch}
      active={inProgress ? {
        label: `${BuildingTranslations[inProgress.code].name} ${inProgress.level} → ${inProgress.level + 1}`,
        startAt: inProgress.upgrade_started_at,
        endAt: inProgress.upgrade_at,
      } : null}
      waiting={waiting.map(item => ({
        id: item.id,
        label: `${BuildingTranslations[item.building_code].name} → ${item.level}`,
        finishAt: item.finish_at,
      }))}
      limit={BUILDING_UPGRADE_QUEUE_LIMIT}
      empty={{
        sentence: 'Aucune construction en cours.',
        cta: { label: 'Choisir un bâtiment', to: '/city/$cityId/base/building', params: { cityId } },
      }}
    />
  )
}

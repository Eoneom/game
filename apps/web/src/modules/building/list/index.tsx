import React, { useMemo } from 'react'
import { BuildingCode } from '@eoneom/api-client'

import { buildingCardData, summarizeQueuedBuildings } from '#building/card'
import { groupByBuildingFamily } from '#building/family'
import { useListBuildings } from '#building/hooks'
import { isBuildingListed } from '#building/layer'
import { BuildingQueuePanel } from '#building/list/queue'
import { projectUpgradeQueueLevels } from '#building/queue-levels'
import { BuildingFamilyLabels } from '#building/translations'
import { useGetCity } from '#city/hooks'
import { useRequirementEvaluator } from '#requirement/hook'
import { BuildingItem } from '#types'
import { useCatalogueCountdown } from '#ui/catalogue/countdown'
import { CatalogueGrid } from '#ui/catalogue/grid'

interface Props {
  cityId: string
  selectedCode: BuildingCode | null
  onSelect: (code: BuildingCode) => void
}

/** Building catalogue (slice 043): queue panel, then cards grouped by family. */
export const BuildingList: React.FC<Props> = ({ cityId, selectedCode, onSelect }) => {
  const { data } = useListBuildings(cityId)
  const { data: city } = useGetCity(cityId)
  const evaluate = useRequirementEvaluator(cityId)

  const buildings = useMemo(() => data?.buildings ?? [], [data])
  const upgradeQueue = useMemo(() => data?.upgrade_queue ?? [], [data])

  const inProgress = buildings.find(
    (b): b is Extract<BuildingItem, { upgrade_at: number }> => 'upgrade_at' in b
  )
  const countdown = useCatalogueCountdown(inProgress?.upgrade_started_at, inProgress?.upgrade_at)

  const queued = useMemo(
    () => summarizeQueuedBuildings(projectUpgradeQueueLevels({ buildings, upgrade_queue: upgradeQueue })),
    [buildings, upgradeQueue]
  )

  // The Enceinte lives in the Défense tab (slice 029); its upgrades still share this queue.
  const groups = useMemo(() => groupByBuildingFamily(buildings.filter(isBuildingListed)).map(({ family, items }) => ({
    id: family,
    title: BuildingFamilyLabels[family],
    cards: items.map(building => buildingCardData(building, {
      inProgressCode: inProgress?.code,
      countdown,
      queued,
      queueLength: upgradeQueue.length,
      city,
      evaluate,
    })),
  })), [buildings, inProgress?.code, countdown, queued, upgradeQueue.length, city, evaluate])

  return (
    <CatalogueGrid
      scope="building"
      groups={groups}
      selectedCode={selectedCode}
      onSelect={code => onSelect(code as BuildingCode)}
      queue={<BuildingQueuePanel cityId={cityId} />}
    />
  )
}

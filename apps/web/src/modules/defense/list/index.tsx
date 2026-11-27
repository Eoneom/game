import React, { useMemo } from 'react'
import { BuildingCode, DefenseCode } from '@eoneom/api-client'

import { buildingCardData, summarizeQueuedBuildings } from '#building/card'
import { useListBuildings } from '#building/hooks'
import { projectUpgradeQueueLevels } from '#building/queue-levels'
import { useGetCity } from '#city/hooks'
import { freeDefensePoints } from '#defense/capacity'
import { DefenseCityWallCapacity } from '#defense/city-wall'
import { DefenseGroup, DefenseGroupLabels, groupByDefenseOwner } from '#defense/group'
import { useCityDefenses } from '#defense/hooks'
import { defenseImageSrc } from '#defense/image'
import { DefenseBuildQueue } from '#defense/queue'
import { DefenseTranslations } from '#defense/translations'
import { unmetRequirementName, useRequirementEvaluator } from '#requirement/hook'
import { BuildingItem } from '#types'
import { CatalogueCardData } from '#ui/catalogue/card'
import { catalogueCityResources, catalogueStock } from '#ui/catalogue/city'
import { useCatalogueCountdown } from '#ui/catalogue/countdown'
import { CatalogueGroup, CatalogueGrid } from '#ui/catalogue/grid'
import { catalogueCardState } from '#ui/catalogue/state'

/** Selection of the Défense tab: a defense or the Enceinte (`?code=city_wall`). */
export type DefenseSelection = DefenseCode | 'city_wall'

interface Props {
  cityId: string
  selectedCode: DefenseSelection | null
  onSelect: (code: DefenseSelection) => void
}

/** Défense catalogue (slice 043): fortification queue, Enceinte wide card, common then faction defenses. */
export const DefenseList: React.FC<Props> = ({ cityId, selectedCode, onSelect }) => {
  const { data } = useCityDefenses(cityId)
  const { data: buildingsData } = useListBuildings(cityId)
  const { data: city } = useGetCity(cityId)
  const evaluate = useRequirementEvaluator(cityId)

  const ongoing = data?.ongoing_build ?? null
  const defenseCountdown = useCatalogueCountdown(ongoing?.started_at, ongoing?.finish_at)

  const buildings = useMemo(() => buildingsData?.buildings ?? [], [buildingsData])
  const upgradeQueue = useMemo(() => buildingsData?.upgrade_queue ?? [], [buildingsData])
  const upgrading = buildings.find(
    (b): b is Extract<BuildingItem, { upgrade_at: number }> => 'upgrade_at' in b
  )
  const wallCountdown = useCatalogueCountdown(
    upgrading?.code === BuildingCode.CITY_WALL ? upgrading.upgrade_started_at : undefined,
    upgrading?.code === BuildingCode.CITY_WALL ? upgrading.upgrade_at : undefined
  )

  const groups = useMemo((): CatalogueGroup[] => {
    const wall = buildings.find(building => building.code === BuildingCode.CITY_WALL)
    const wallCard: CatalogueCardData | null = wall ? {
      ...buildingCardData(wall, {
        inProgressCode: upgrading?.code,
        countdown: wallCountdown,
        queued: summarizeQueuedBuildings(projectUpgradeQueueLevels({ buildings, upgrade_queue: upgradeQueue })),
        queueLength: upgradeQueue.length,
        city,
        evaluate,
      }),
      code: 'city_wall',
      wide: true,
      extra: <DefenseCityWallCapacity defenses={data} />,
    } : null

    const capacity = data?.capacity ?? { total: 0, used: 0, queued: 0 }
    const queue = data?.build_queue ?? []
    const free = freeDefensePoints(capacity)
    const defenseGroups = groupByDefenseOwner(data?.defenses ?? []).map(({ group, items }) => ({
      id: group,
      title: DefenseGroupLabels[group],
      cards: items.map((defense): CatalogueCardData => {
        const isActive = ongoing?.defense_code === defense.code
        return {
          code: defense.code,
          name: DefenseTranslations[defense.code].name,
          image: defenseImageSrc(defense.code),
          amount: { kind: 'count', value: defense.count },
          extra: (
            <p className="m-0 text-caption text-label">
              ATK {defense.attack_by_round?.join('-') ?? defense.attack} / VIE {defense.life} · {defense.points} pt{defense.points > 1 ? 's' : ''}
            </p>
          ),
          cost: { target_label: '▸ × 1', ...defense.cost },
          stock: catalogueStock(city),
          state: catalogueCardState({
            catalogue: 'defense',
            in_progress: isActive && ongoing ? { remaining_units: ongoing.remaining_count } : undefined,
            queued: { count: queue.filter(item => item.defense_code === defense.code).length },
            unmet_requirements: evaluate(defense.requirement).map(unmet => ({
              name: unmetRequirementName(unmet),
              level: unmet.level,
            })),
            defense_capacity: { free, points: defense.points },
            queue: { active: ongoing !== null, length: queue.length, limit: data?.build_queue_limit ?? 0 },
            cost: defense.cost,
            city: catalogueCityResources(city),
          }),
          progress: isActive && defenseCountdown ? { elapsed: defenseCountdown.elapsed } : undefined,
        }
      }),
    }))

    return [
      ...(wallCard ? [ { id: DefenseGroup.CITY_WALL, title: DefenseGroupLabels[DefenseGroup.CITY_WALL], cards: [ wallCard ] } ] : []),
      ...defenseGroups,
    ]
  }, [buildings, upgradeQueue, upgrading?.code, wallCountdown, city, evaluate, data, ongoing, defenseCountdown])

  return (
    <CatalogueGrid
      scope="defense"
      groups={groups}
      selectedCode={selectedCode}
      onSelect={code => onSelect(code as DefenseSelection)}
      queue={<DefenseBuildQueue cityId={cityId} />}
    />
  )
}

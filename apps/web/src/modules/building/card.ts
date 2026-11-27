import { BUILDING_UPGRADE_QUEUE_LIMIT, BuildingCode, Requirement } from '@eoneom/api-client'

import { buildingImageSrc } from '#building/image'
import { isLevelCappedBuilding } from '#building/layer'
import { BuildingUpgradeQueueItemWithLevel } from '#building/queue-levels'
import { BuildingTranslations } from '#building/translations'
import { UnmetRequirement, unmetRequirementName } from '#requirement/hook'
import { City, BuildingItem } from '#types'
import { CatalogueCardData } from '#ui/catalogue/card'
import { catalogueCityResources, catalogueStock } from '#ui/catalogue/city'
import { CatalogueCountdown } from '#ui/catalogue/countdown'
import { catalogueCardState } from '#ui/catalogue/state'

interface BuildingQueuedSummary {
  count: number
  /** Level reached by the last waiting row of this building. */
  target_level: number
}

/** Waiting rows per building, with the level the last one reaches (`projectUpgradeQueueLevels`). */
export const summarizeQueuedBuildings = (
  queued: BuildingUpgradeQueueItemWithLevel[]
): Map<BuildingCode, BuildingQueuedSummary> => {
  const summary = new Map<BuildingCode, BuildingQueuedSummary>()
  for (const item of queued) {
    const previous = summary.get(item.building_code)
    summary.set(item.building_code, { count: (previous?.count ?? 0) + 1, target_level: item.level })
  }
  return summary
}

interface BuildingCardContext {
  /** Building being upgraded in the city, if any. */
  inProgressCode?: BuildingCode
  countdown: CatalogueCountdown | null
  queued: Map<BuildingCode, BuildingQueuedSummary>
  queueLength: number
  city?: City
  evaluate: (requirement: Requirement) => UnmetRequirement[]
}

/** Card of a building or of the Enceinte (slice 043): next level cost and the building state rules. */
export const buildingCardData = (building: BuildingItem, context: BuildingCardContext): CatalogueCardData => {
  const isActive = context.inProgressCode === building.code
  const { city } = context

  return {
    code: building.code,
    name: BuildingTranslations[building.code].name,
    image: buildingImageSrc(building.code),
    amount: { kind: 'level', value: building.level },
    cost: {
      target_label: `▸ niv. ${building.level + 1}`,
      ...building.upgrade_cost,
    },
    stock: catalogueStock(city),
    state: catalogueCardState({
      catalogue: 'building',
      in_progress: isActive ? { remaining_seconds: context.countdown?.remaining_seconds } : undefined,
      queued: context.queued.get(building.code),
      unmet_requirements: context.evaluate(building.requirement).map(unmet => ({
        name: unmetRequirementName(unmet),
        level: unmet.level,
      })),
      level_cap: isLevelCappedBuilding(building.code) && city
        ? { used: city.building_levels_used, maximum: city.maximum_building_levels }
        : undefined,
      queue: {
        active: context.inProgressCode !== undefined,
        length: context.queueLength,
        limit: BUILDING_UPGRADE_QUEUE_LIMIT,
      },
      cost: building.upgrade_cost,
      city: catalogueCityResources(city),
    }),
    progress: isActive && context.countdown ? { elapsed: context.countdown.elapsed } : undefined,
  }
}

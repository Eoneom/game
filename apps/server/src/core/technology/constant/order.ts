import { TechnologyCode } from '#core/technology/constant/code'

export const technology_order: Record<TechnologyCode, number> = {
  [TechnologyCode.ARCHITECTURE]: 1,
  [TechnologyCode.REPLICATION_CATALYST]: 2,
  [TechnologyCode.OUTPOST_LOGISTICS]: 3,
  [TechnologyCode.OUTPOST_EXPANSION]: 4,
  [TechnologyCode.PHOTOVOLTAIC_OPTIMIZATION]: 5
}

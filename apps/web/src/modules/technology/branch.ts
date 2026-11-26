import { TechnologyCode } from '@eoneom/api-client'

export enum TechnologyBranch {
  FOUNDATIONS = 'foundations',
  ARSENAL = 'arsenal',
  ECONOMY = 'economy',
}

/** Display order of branches in the technology list. */
const technology_branch_order: TechnologyBranch[] = [
  TechnologyBranch.FOUNDATIONS,
  TechnologyBranch.ARSENAL,
  TechnologyBranch.ECONOMY,
]

export const technology_branch: Record<TechnologyCode, TechnologyBranch> = {
  [TechnologyCode.ARCHITECTURE]: TechnologyBranch.FOUNDATIONS,
  [TechnologyCode.REPLICATION_CATALYST]: TechnologyBranch.FOUNDATIONS,
  [TechnologyCode.OUTPOST_LOGISTICS]: TechnologyBranch.FOUNDATIONS,
  [TechnologyCode.OUTPOST_EXPANSION]: TechnologyBranch.FOUNDATIONS,
  [TechnologyCode.PHOTOVOLTAIC_OPTIMIZATION]: TechnologyBranch.FOUNDATIONS,
  [TechnologyCode.BALLISTIC_ALLOYS]: TechnologyBranch.ARSENAL,
  [TechnologyCode.ORGANIC_PLATING]: TechnologyBranch.ARSENAL,
  [TechnologyCode.TACTICAL_PROPULSION]: TechnologyBranch.ARSENAL,
  [TechnologyCode.ADVANCED_RECYCLING]: TechnologyBranch.ECONOMY,
  [TechnologyCode.AGRONOMY]: TechnologyBranch.ECONOMY,
  [TechnologyCode.STORAGE_COMPRESSION]: TechnologyBranch.ECONOMY,
  [TechnologyCode.PLASMA_CONTAINMENT]: TechnologyBranch.ECONOMY,
}

/** Groups items by branch in `technology_branch_order`, keeping input order within a branch; empty branches are dropped. */
export const groupByTechnologyBranch = <T extends { code: TechnologyCode }>(
  items: T[]
): Array<{ branch: TechnologyBranch, items: T[] }> =>
  technology_branch_order
    .map(branch => ({
      branch,
      items: items.filter(item => technology_branch[item.code] === branch),
    }))
    .filter(group => group.items.length > 0)

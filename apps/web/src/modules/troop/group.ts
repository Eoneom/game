import { TroopCode, TroopRole, troop_role } from '@eoneom/api-client'

export enum TroopGroup {
  COMBAT = 'combat',
  INTEL = 'intel',
  LOGISTICS = 'logistics',
  EXPANSION = 'expansion',
}

/** Display order and roles of each troop group (slice 043). */
const troop_group_roles: Array<{ group: TroopGroup, roles: TroopRole[] }> = [
  { group: TroopGroup.COMBAT, roles: [ TroopRole.COMBAT ] },
  { group: TroopGroup.INTEL, roles: [ TroopRole.SCOUT ] },
  { group: TroopGroup.LOGISTICS, roles: [ TroopRole.CARRIER ] },
  { group: TroopGroup.EXPANSION, roles: [ TroopRole.FOUNDER, TroopRole.CULTIVATOR, TroopRole.SALVAGER ] },
]

export const TroopGroupLabels: Record<TroopGroup, string> = {
  [TroopGroup.COMBAT]: 'Combat',
  [TroopGroup.INTEL]: 'Reconnaissance',
  [TroopGroup.LOGISTICS]: 'Logistique',
  [TroopGroup.EXPANSION]: 'Expansion et récolte',
}

/** Groups troops by role in display order, keeping input order within a group; empty groups are dropped. */
export const groupByTroopRole = <T extends { code: TroopCode }>(
  items: T[]
): Array<{ group: TroopGroup, items: T[] }> =>
  troop_group_roles
    .map(({ group, roles }) => ({
      group,
      items: items.filter(item => roles.includes(troop_role[item.code])),
    }))
    .filter(group => group.items.length > 0)

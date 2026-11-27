import { DefenseCode, defense_faction } from '@eoneom/api-client'

export enum DefenseGroup {
  CITY_WALL = 'city_wall',
  COMMON = 'common',
  FACTION = 'faction',
}

export const DefenseGroupLabels: Record<DefenseGroup, string> = {
  [DefenseGroup.CITY_WALL]: 'Enceinte',
  [DefenseGroup.COMMON]: 'Défenses communes',
  [DefenseGroup.FACTION]: 'Défenses de faction',
}

/** Splits the defense catalogue into common and faction defenses (slice 043), keeping input order; empty groups are dropped. */
export const groupByDefenseOwner = <T extends { code: DefenseCode }>(
  items: T[]
): Array<{ group: DefenseGroup.COMMON | DefenseGroup.FACTION, items: T[] }> =>
  ([
    { group: DefenseGroup.COMMON, items: items.filter(item => defense_faction[item.code] === undefined) },
    { group: DefenseGroup.FACTION, items: items.filter(item => defense_faction[item.code] !== undefined) },
  ] as const).filter(group => group.items.length > 0)

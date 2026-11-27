import { describe, expect, it } from 'vitest'
import { TroopCode, TroopRole, troop_role } from '@eoneom/api-client'

import { groupByTroopRole, TroopGroup, TroopGroupLabels } from '#troop/group'

describe('groupByTroopRole (043)', () => {
  it('groups by role in display order, merges expansion roles and keeps the server order', () => {
    const groups = groupByTroopRole([
      { code: TroopCode.SETTLER },
      { code: TroopCode.LEGIONNAIRE },
      { code: TroopCode.RECYCLER },
      { code: TroopCode.FARMER },
      { code: TroopCode.EXPLORER },
    ])

    expect(groups.map(group => group.group)).toEqual([ TroopGroup.COMBAT, TroopGroup.INTEL, TroopGroup.EXPANSION ])
    expect(groups[2].items.map(item => item.code)).toEqual([ TroopCode.SETTLER, TroopCode.RECYCLER, TroopCode.FARMER ])
  })

  it('places every troop code in exactly one group', () => {
    const all = Object.values(TroopCode).map(code => ({ code }))
    const grouped = groupByTroopRole(all).flatMap(group => group.items)
    expect(grouped).toHaveLength(all.length)
    expect(new Set(Object.values(troop_role))).toEqual(new Set(Object.values(TroopRole)))
  })

  it('has French labels', () => {
    expect(TroopGroupLabels).toEqual({
      [TroopGroup.COMBAT]: 'Combat',
      [TroopGroup.INTEL]: 'Reconnaissance',
      [TroopGroup.LOGISTICS]: 'Logistique',
      [TroopGroup.EXPANSION]: 'Expansion et récolte',
    })
  })
})

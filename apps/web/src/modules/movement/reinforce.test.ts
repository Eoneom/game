import { TroopCode } from '@eoneom/api-client'
import { describe, expect, it } from 'vitest'

import { isCombatOnlySelection } from './reinforce'

/** The allied-city rule moved to the destination kind of the send wizard (`api/destination.test.ts`, slice 045). */
describe('reinforce action', () => {
  it('needs combat troops only', () => {
    expect(isCombatOnlySelection([ { code: TroopCode.LEGIONNAIRE, count: 2 } ])).toBe(true)
    expect(isCombatOnlySelection([ { code: TroopCode.LEGIONNAIRE, count: 2 }, { code: TroopCode.EXPLORER, count: 1 } ])).toBe(false)
    expect(isCombatOnlySelection([])).toBe(false)
  })
})

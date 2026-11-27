import { AllianceRole, FactionCode, TroopCode, type AllianceMineDataResponse } from '@eoneom/api-client'
import { describe, expect, it } from 'vitest'

import { isCombatOnlySelection, isReinforceActionAvailable } from './reinforce'

const myAlliance: AllianceMineDataResponse = {
  viewer_player_id: 'me',
  cooldown_until: null,
  alliance: {
    id: 'a1',
    name: 'Les Veilleurs',
    tag: 'VEIL',
    description: '',
    faction_code: FactionCode.THE_CONFEDERATION,
    created_at: 0,
    viewer_role: AllianceRole.MEMBRE,
    members: [
      { player_id: 'me', name: 'Moi', role: AllianceRole.MEMBRE, joined_at: 0, cities: [ { id: 'c1', name: 'Ici', coordinates: { x: 1, y: 1 } } ] },
      { player_id: 'ally', name: 'Allié', role: AllianceRole.CHEF, joined_at: 0, cities: [ { id: 'c2', name: 'Là', coordinates: { x: 5, y: 5 } } ] },
    ],
  },
}

describe('reinforce action', () => {
  it('needs combat troops only', () => {
    expect(isCombatOnlySelection([ { code: TroopCode.LEGIONNAIRE, count: 2 } ])).toBe(true)
    expect(isCombatOnlySelection([ { code: TroopCode.LEGIONNAIRE, count: 2 }, { code: TroopCode.EXPLORER, count: 1 } ])).toBe(false)
    expect(isCombatOnlySelection([])).toBe(false)
  })

  it('is offered for an allied city only, not an own city or a stranger', () => {
    const troops = [ { code: TroopCode.LEGIONNAIRE, count: 2 } ]
    expect(isReinforceActionAvailable({ troops, destination: { x: 5, y: 5 }, myAlliance })).toBe(true)
    expect(isReinforceActionAvailable({ troops, destination: { x: 1, y: 1 }, myAlliance })).toBe(false)
    expect(isReinforceActionAvailable({ troops, destination: { x: 9, y: 9 }, myAlliance })).toBe(false)
    expect(isReinforceActionAvailable({ troops, destination: { x: 5, y: 5 }, myAlliance: { ...myAlliance, alliance: null } })).toBe(false)
  })
})

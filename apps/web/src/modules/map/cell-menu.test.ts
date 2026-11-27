import { describe, expect, it } from 'vitest'
import { MovementAction } from '@eoneom/api-client'

import {
  ESPIONAGE_DISABLED,
  MapCellContext,
  OUTPOST_LIMIT_REACHED,
  SAME_FACTION_NOTICE,
  mapCellActions,
  movementLimitReason,
} from '#map/cell-menu'

const context = (overrides: Partial<MapCellContext> = {}): MapCellContext => ({
  explored: true,
  city: null,
  outpost: null,
  isOrigin: false,
  espionageLevel: 1,
  movementCapacity: { used: 1, limit: 5 },
  outpostCapacity: { count: 0, limit: 2 },
  ...overrides,
})

const summary = (ctx: MapCellContext) => mapCellActions(ctx).actions.map(action => [
  action.label,
  action.action ?? action.settleOutpostId,
  action.disabledReason ?? null,
])

describe('map cell menu gating (slice 044)', () => {
  it('offers only exploration on an unexplored cell', () => {
    expect(summary(context({ explored: false }))).toEqual([ [ 'Explorer', MovementAction.EXPLORE, null ] ])
    // Even with a settlement on it: the server needs the cell explored first.
    expect(summary(context({ explored: false, city: { id: 'c', relation: 'enemy' } }))).toEqual([ [ 'Explorer', MovementAction.EXPLORE, null ] ])
  })

  it('settles an empty explored cell, disabled at the outpost cap; never offers an attack there', () => {
    expect(summary(context())).toEqual([ [ 'Établir un avant-poste', MovementAction.BASE, null ] ])
    expect(summary(context({ outpostCapacity: { count: 2, limit: 2 } }))).toEqual([ [ 'Établir un avant-poste', MovementAction.BASE, OUTPOST_LIMIT_REACHED ] ])
  })

  it('transports to and stations in own locations; an own outpost can found a city', () => {
    expect(summary(context({ city: { id: 'c', relation: 'mine' } }))).toEqual([
      [ 'Transporter', MovementAction.TRANSPORT, null ],
      [ 'Stationner', MovementAction.BASE, null ],
    ])
    expect(summary(context({ outpost: { id: 'o1', relation: 'mine' } }))).toEqual([
      [ 'Transporter', MovementAction.TRANSPORT, null ],
      [ 'Stationner', MovementAction.BASE, null ],
      [ 'Fonder une ville', 'o1', null ],
    ])
  })

  it('reinforces allied cities only', () => {
    expect(summary(context({ city: { id: 'c', relation: 'ally' } }))).toEqual([ [ 'Renforcer', MovementAction.REINFORCE, null ] ])
    expect(mapCellActions(context({ outpost: { id: 'o', relation: 'ally' } }))).toEqual({ actions: [], notice: SAME_FACTION_NOTICE })
  })

  it('offers nothing on a same-faction settlement', () => {
    expect(mapCellActions(context({ city: { id: 'c', relation: 'faction' } }))).toEqual({ actions: [], notice: SAME_FACTION_NOTICE })
  })

  it('attacks and spies enemy and system settlements, spy disabled without Espionnage', () => {
    for (const relation of [ 'enemy', 'system' ] as const) {
      expect(summary(context({ city: { id: 'c', relation } }))).toEqual([
        [ 'Attaquer', MovementAction.ATTACK, null ],
        [ 'Espionner', MovementAction.SPY, null ],
      ])
      expect(summary(context({ outpost: { id: 'o', relation }, espionageLevel: 0 }))).toEqual([
        [ 'Attaquer', MovementAction.ATTACK, null ],
        [ 'Espionner', MovementAction.SPY, ESPIONAGE_DISABLED ],
      ])
    }
  })

  it('disables every movement action when the movement cap is reached', () => {
    const capacity = { used: 5, limit: 5 }
    expect(movementLimitReason(capacity)).toBe('Mouvements 5 / 5 — limite atteinte')
    expect(summary(context({ city: { id: 'c', relation: 'enemy' }, movementCapacity: capacity }))).toEqual([
      [ 'Attaquer', MovementAction.ATTACK, 'Mouvements 5 / 5 — limite atteinte' ],
      [ 'Espionner', MovementAction.SPY, 'Mouvements 5 / 5 — limite atteinte' ],
    ])
    expect(summary(context({ outpost: { id: 'o1', relation: 'mine' }, movementCapacity: capacity })).at(-1)).toEqual([ 'Fonder une ville', 'o1', null ])
  })

  it('sends nothing to the current location itself', () => {
    const result = mapCellActions(context({ outpost: { id: 'o1', relation: 'mine' }, isOrigin: true }))
    expect(result.actions.map(action => action.label)).toEqual([ 'Fonder une ville' ])
    expect(result.notice).toMatch(/Emplacement actuel/)
  })
})

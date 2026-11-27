import { describe, expect, it } from 'vitest'
import { Coordinates, MovementAction, MovementKind } from '@eoneom/api-client'

import { classifyLocationMovements } from './movements'

/** Slice 042: the dashboard groups own movements of one location by the server's `kind` (slice 045). */

const HERE: Coordinates = { x: 12, y: 7 }
const ELSEWHERE: Coordinates = { x: 15, y: 2 }
const OTHER_CITY: Coordinates = { x: 9, y: 4 }

const movement = (id: string, kind: MovementKind, action: MovementAction, origin: Coordinates, destination: Coordinates) => ({
  id,
  kind,
  action,
  origin,
  destination,
})

const ids = (rows: { id: string }[]) => rows.map(row => row.id)

describe('classifyLocationMovements', () => {
  it('counts outgoing movements leaving this location, attacks and rebases away included', () => {
    const result = classifyLocationMovements({
      coordinates: HERE,
      movements: [
        movement('attack', MovementKind.OUTGOING, MovementAction.ATTACK, HERE, ELSEWHERE),
        movement('spy', MovementKind.OUTGOING, MovementAction.SPY, HERE, ELSEWHERE),
        movement('rebase', MovementKind.OUTGOING, MovementAction.BASE, HERE, OTHER_CITY),
      ],
    })

    expect(ids(result.outgoing)).toEqual([ 'attack', 'spy', 'rebase' ])
    expect(result.returning).toEqual([])
    expect(result.convoys).toEqual([])
  })

  it('counts a return trip reaching this location as returning', () => {
    const result = classifyLocationMovements({
      coordinates: HERE,
      movements: [
        movement('back', MovementKind.RETURN, MovementAction.BASE, ELSEWHERE, HERE),
        // A return heading to another city is not this location's.
        movement('back-elsewhere', MovementKind.RETURN, MovementAction.BASE, HERE, OTHER_CITY),
      ],
    })

    expect(ids(result.returning)).toEqual([ 'back' ])
    expect(result.outgoing).toEqual([])
  })

  it('counts exchange convoys leaving and reaching this location', () => {
    const result = classifyLocationMovements({
      coordinates: HERE,
      movements: [
        movement('delivery', MovementKind.CONVOY, MovementAction.EXCHANGE, HERE, OTHER_CITY),
        movement('incoming-delivery', MovementKind.CONVOY, MovementAction.EXCHANGE, OTHER_CITY, HERE),
        movement('carriers-home', MovementKind.CONVOY, MovementAction.BASE, OTHER_CITY, HERE),
      ],
    })

    expect(ids(result.convoys)).toEqual([ 'delivery', 'incoming-delivery', 'carriers-home' ])
  })

  it('ignores movements of other locations', () => {
    const result = classifyLocationMovements({
      coordinates: HERE,
      movements: [
        movement('other-attack', MovementKind.OUTGOING, MovementAction.ATTACK, OTHER_CITY, ELSEWHERE),
        movement('other-convoy', MovementKind.CONVOY, MovementAction.EXCHANGE, OTHER_CITY, ELSEWHERE),
        // Own outgoing movement from another city arriving here: counted on its origin's dashboard.
        movement('transport-in', MovementKind.OUTGOING, MovementAction.TRANSPORT, OTHER_CITY, HERE),
      ],
    })

    expect(result.rows).toEqual([])
  })

  it('keeps the group of every row in list order', () => {
    const result = classifyLocationMovements({
      coordinates: HERE,
      movements: [
        movement('a', MovementKind.CONVOY, MovementAction.EXCHANGE, HERE, OTHER_CITY),
        movement('b', MovementKind.OUTGOING, MovementAction.EXPLORE, HERE, ELSEWHERE),
        movement('c', MovementKind.RETURN, MovementAction.BASE, ELSEWHERE, HERE),
      ],
    })

    expect(result.rows.map(row => [ row.movement.id, row.group ])).toEqual([
      [ 'a', 'convoy' ],
      [ 'b', 'outgoing' ],
      [ 'c', 'returning' ],
    ])
  })
})

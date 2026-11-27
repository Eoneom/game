import { describe, expect, it } from 'vitest'
import { MovementAction, MovementKind } from '@eoneom/api-client'

import {
  movementsOfTab,
  sortMovements,
  validateMovementListSearch,
} from '#movement/list/sort'

const row = (id: string, kind: MovementKind, action: MovementAction, arrive_at: number) => ({ id, kind, action, arrive_at })

describe('movement tabs and sorting (slice 045)', () => {
  const rows = [
    row('explore', MovementKind.OUTGOING, MovementAction.EXPLORE, 300),
    row('return', MovementKind.RETURN, MovementAction.BASE, 100),
    row('convoy', MovementKind.CONVOY, MovementAction.EXCHANGE, 200),
    row('attack', MovementKind.OUTGOING, MovementAction.ATTACK, 400),
    row('carriers', MovementKind.CONVOY, MovementAction.BASE, 50),
  ]

  it('puts each own movement in the tab of its kind', () => {
    expect(movementsOfTab(rows, 'sortants').map(entry => entry.id)).toEqual([ 'explore', 'attack' ])
    expect(movementsOfTab(rows, 'retours').map(entry => entry.id)).toEqual([ 'return' ])
    expect(movementsOfTab(rows, 'convois').map(entry => entry.id)).toEqual([ 'convoy', 'carriers' ])
  })

  it('sorts by arrival, soonest or latest first', () => {
    expect(sortMovements(rows, 'arrival').map(entry => entry.id)).toEqual([ 'carriers', 'return', 'convoy', 'explore', 'attack' ])
    expect(sortMovements(rows, '-arrival').map(entry => entry.id)).toEqual([ 'attack', 'explore', 'convoy', 'return', 'carriers' ])
  })

  it('sorts by order label then arrival', () => {
    const outgoing = [
      row('explore-late', MovementKind.OUTGOING, MovementAction.EXPLORE, 500),
      row('attack', MovementKind.OUTGOING, MovementAction.ATTACK, 400),
      row('explore-soon', MovementKind.OUTGOING, MovementAction.EXPLORE, 100),
      row('transport', MovementKind.OUTGOING, MovementAction.TRANSPORT, 50),
    ]
    // « Attaquer » < « Explorer » < « Transporter ».
    expect(sortMovements(outgoing, 'action').map(entry => entry.id)).toEqual([ 'attack', 'explore-soon', 'explore-late', 'transport' ])
  })

  it('keeps the input order on ties', () => {
    const tied = [ row('a', MovementKind.OUTGOING, MovementAction.BASE, 10), row('b', MovementKind.OUTGOING, MovementAction.BASE, 10) ]
    expect(sortMovements(tied, 'arrival').map(entry => entry.id)).toEqual([ 'a', 'b' ])
    expect(sortMovements(tied, 'action').map(entry => entry.id)).toEqual([ 'a', 'b' ])
    expect(sortMovements([ ...tied ].reverse(), 'arrival').map(entry => entry.id)).toEqual([ 'b', 'a' ])
  })

  it('drops invalid list search values', () => {
    expect(validateMovementListSearch({ tab: 'retours', sort: '-arrival', incoming: 'm1' }))
      .toEqual({ tab: 'retours', sort: '-arrival', incoming: 'm1' })
    expect(validateMovementListSearch({ tab: 'nope', sort: 42, incoming: '' }))
      .toEqual({ tab: undefined, sort: undefined, incoming: undefined })
  })
})

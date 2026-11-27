import { describe, expect, it } from 'vitest'
import { CombatStrategy, MovementAction, TroopCode, WORLD_SIZE } from '@eoneom/api-client'

import {
  MovementSendState,
  parseMovementSendSearch,
  parseTroops,
  resolveStep,
  serializeMovementSendState,
  validateMovementSendSearch,
} from '#movement/send/search'

describe('send wizard URL state (slice 045)', () => {
  it('round-trips every param', () => {
    const state: MovementSendState = {
      step: 'recap',
      x: 12,
      y: 7,
      action: MovementAction.TRANSPORT,
      troops: { [TroopCode.LEGIONNAIRE]: 20, [TroopCode.LIGHT_TRANSPORTER]: 5 },
      cargo: { plastic: 100, mushroom: 50, plasma: 2, water: 10 },
      strategy: CombatStrategy.SIEGE_ASSAULT,
    }
    const search = serializeMovementSendState(state)
    expect(search).toEqual({
      step: 'recap',
      x: 12,
      y: 7,
      action: MovementAction.TRANSPORT,
      troops: `${TroopCode.LEGIONNAIRE}:20,${TroopCode.LIGHT_TRANSPORTER}:5`,
      plastic: 100,
      mushroom: 50,
      plasma: 2,
      water: 10,
      strategy: CombatStrategy.SIEGE_ASSAULT,
    })
    expect(parseMovementSendSearch(search as Record<string, unknown>)).toEqual(state)
  })

  it('reads string values from the URL', () => {
    expect(parseMovementSendSearch({ x: '3', y: '4', plastic: '12' })).toMatchObject({ x: 3, y: 4, cargo: { plastic: 12 } })
  })

  it('drops unknown troop codes and counts ≤ 0', () => {
    expect(parseTroops(`${TroopCode.LEGIONNAIRE}:20,ghost:5,${TroopCode.EXPLORER}:0,${TroopCode.SEEKER}:-2,${TroopCode.INTERCEPTOR}:x`))
      .toEqual({ [TroopCode.LEGIONNAIRE]: 20 })
    expect(parseTroops(42)).toEqual({})
  })

  it('drops invalid coordinates, actions, strategies and amounts', () => {
    expect(validateMovementSendSearch({
      x: 0,
      y: 5,
      action: MovementAction.EXCHANGE,
      strategy: 'yolo',
      plastic: -3,
      water: 1.5,
      step: 'nowhere',
    })).toEqual({})
    expect(validateMovementSendSearch({ x: WORLD_SIZE + 1, y: 1 })).toEqual({})
    expect(validateMovementSendSearch({ x: WORLD_SIZE, y: 1, action: MovementAction.SPY })).toEqual({ x: WORLD_SIZE, y: 1, action: MovementAction.SPY })
  })

  it('defaults the step from the destination', () => {
    expect(resolveStep(parseMovementSendSearch({}))).toBe('destination')
    expect(resolveStep(parseMovementSendSearch({ x: 12, y: 7, action: MovementAction.ATTACK }))).toBe('ordre')
  })

  it('guards the steps: ordre needs a destination, recap an action and troops', () => {
    expect(resolveStep(parseMovementSendSearch({ step: 'ordre' }))).toBe('destination')
    expect(resolveStep(parseMovementSendSearch({ step: 'recap', x: 1, y: 2, action: MovementAction.EXPLORE }))).toBe('ordre')
    expect(resolveStep(parseMovementSendSearch({ step: 'recap', x: 1, y: 2, troops: `${TroopCode.EXPLORER}:1` }))).toBe('ordre')
    expect(resolveStep(parseMovementSendSearch({
      step: 'recap',
      x: 1,
      y: 2,
      action: MovementAction.EXPLORE,
      troops: `${TroopCode.EXPLORER}:1`,
    }))).toBe('recap')
    expect(resolveStep(parseMovementSendSearch({ step: 'destination', x: 1, y: 2 }))).toBe('destination')
  })
})

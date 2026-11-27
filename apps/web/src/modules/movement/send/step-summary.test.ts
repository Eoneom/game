import { describe, expect, it } from 'vitest'
import { TroopCode } from '@eoneom/api-client'

import { appliedBonuses, estimatedArrival } from '#movement/send/step-summary'

describe('summary estimate (slice 045)', () => {
  const neutral = { propulsion_level: 0, non_combat_speed_multiplier: 1, carrier_capacity_multiplier: 1 }
  const confederation = { propulsion_level: 3, non_combat_speed_multiplier: 1.05, carrier_capacity_multiplier: 1.1 }

  it('lists Propulsion tactique for movements with combat units', () => {
    expect(appliedBonuses(confederation, [ { code: TroopCode.LEGIONNAIRE, count: 2 } ])).toEqual([ 'Propulsion tactique niv. 3' ])
    expect(appliedBonuses(neutral, [ { code: TroopCode.LEGIONNAIRE, count: 2 } ])).toEqual([])
  })

  it('lists the Confederation logistics bonuses without combat units and with carriers', () => {
    expect(appliedBonuses(confederation, [ { code: TroopCode.LIGHT_TRANSPORTER, count: 1 } ])).toEqual([
      'Logistique confédérée : +5 % vitesse',
      '+10 % capacité des transporteurs',
    ])
    expect(appliedBonuses(confederation, [ { code: TroopCode.EXPLORER, count: 1 } ])).toEqual([ 'Logistique confédérée : +5 % vitesse' ])
  })

  it('reads the duration in seconds', () => {
    expect(estimatedArrival(1_000_000, 90)).toBe(1_090_000)
    expect(estimatedArrival(0, 1.2)).toBe(2_000)
  })
})

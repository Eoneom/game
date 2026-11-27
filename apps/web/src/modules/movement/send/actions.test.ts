import { describe, expect, it } from 'vitest'
import { MovementAction, TroopCode } from '@eoneom/api-client'

import {
  DestinationKind,
  ESPIONAGE_REQUIRED,
  actionChoices,
  actionLabel,
  actionsForDestination,
  orderBlockers,
  resolveAction,
  restrictSelection,
  troopRestriction,
} from '#movement/send/actions'

const { EXPLORE, BASE, TRANSPORT, ATTACK, SPY, REINFORCE, EXCHANGE } = MovementAction

describe('send wizard destination × action matrix (slice 045)', () => {
  it('offers exactly the actions of the spec table for each destination', () => {
    const expected: Record<DestinationKind, MovementAction[]> = {
      unexplored: [ EXPLORE ],
      empty: [ BASE, ATTACK, SPY ],
      own_city: [ BASE, TRANSPORT ],
      own_outpost: [ BASE, TRANSPORT ],
      allied_city: [ REINFORCE ],
      friendly: [],
      enemy_city: [ ATTACK, SPY ],
      enemy_outpost: [ ATTACK, SPY ],
    }
    for (const [ kind, actions ] of Object.entries(expected)) {
      expect([ ...actionsForDestination(kind as DestinationKind) ].sort()).toEqual([ ...actions ].sort())
      expect(actionsForDestination(kind as DestinationKind)).not.toContain(EXCHANGE)
    }
  })

  it('uses the contextual « Baser » labels', () => {
    expect(actionLabel(BASE, 'own_city')).toBe('Stationner')
    expect(actionLabel(BASE, 'own_outpost')).toBe('Stationner')
    expect(actionLabel(BASE, 'empty')).toBe('Établir un avant-poste')
    expect(actionLabel(ATTACK, 'enemy_city')).toBe('Attaquer')
  })

  it('disables, not hides, « Espionner » without Espionnage', () => {
    const without = actionChoices({ kind: 'enemy_city', espionage_level: 0 })
    expect(without.find(choice => choice.action === SPY)?.disabled_reason).toBe(ESPIONAGE_REQUIRED)
    expect(actionChoices({ kind: 'enemy_city', espionage_level: 1 }).find(choice => choice.action === SPY)?.disabled_reason)
      .toBeUndefined()
  })

  it('hints that attack and spy on an empty cell need a field stack', () => {
    const choices = actionChoices({ kind: 'empty', espionage_level: 1 })
    expect(choices.find(choice => choice.action === ATTACK)?.hint).toBe('Seulement si des troupes ennemies s\'y trouvent')
    expect(choices.find(choice => choice.action === BASE)?.hint).toBeUndefined()
  })

  it('ignores a prefilled action the destination refuses and preselects a lone choice', () => {
    expect(resolveAction({ requested: ATTACK, kind: 'enemy_city', espionage_level: 0 })).toBe(ATTACK)
    expect(resolveAction({ requested: ATTACK, kind: 'own_city', espionage_level: 0 })).toBeUndefined()
    expect(resolveAction({ requested: undefined, kind: 'unexplored', espionage_level: 0 })).toBe(EXPLORE)
    expect(resolveAction({ requested: undefined, kind: 'allied_city', espionage_level: 0 })).toBe(REINFORCE)
    // Spy disabled at Espionnage 0: attack is the only enabled choice.
    expect(resolveAction({ requested: SPY, kind: 'enemy_city', espionage_level: 0 })).toBe(ATTACK)
    expect(resolveAction({ requested: EXPLORE, kind: undefined, espionage_level: 0 })).toBeUndefined()
  })
})

describe('send wizard troop rules (slice 045)', () => {
  it('spy takes scouts only', () => {
    expect(troopRestriction(SPY, TroopCode.EXPLORER)).toBeNull()
    expect(troopRestriction(SPY, TroopCode.SEEKER)).toBeNull()
    expect(troopRestriction(SPY, TroopCode.LEGIONNAIRE)).toBe('Seuls les éclaireurs peuvent espionner.')
  })

  it('attack disables scouts and requires one combat unit', () => {
    expect(troopRestriction(ATTACK, TroopCode.EXPLORER)).toBe('Les éclaireurs ne peuvent pas attaquer.')
    expect(troopRestriction(ATTACK, TroopCode.LIGHT_TRANSPORTER)).toBeNull()
    expect(orderBlockers({ action: ATTACK, selection: { [TroopCode.LIGHT_TRANSPORTER]: 2 }, cargo_load: 0, transport_capacity: 0 }))
      .toEqual([ 'Une attaque doit compter au moins une unité de combat.' ])
    expect(orderBlockers({
      action: ATTACK,
      selection: { [TroopCode.LIGHT_TRANSPORTER]: 2, [TroopCode.LEGIONNAIRE]: 1 },
      cargo_load: 0,
      transport_capacity: 0,
    })).toEqual([])
  })

  it('reinforce takes combat units only', () => {
    expect(troopRestriction(REINFORCE, TroopCode.LEGIONNAIRE)).toBeNull()
    expect(troopRestriction(REINFORCE, TroopCode.LIGHT_TRANSPORTER)).toBe('Seules les unités de combat peuvent renforcer.')
    expect(orderBlockers({ action: REINFORCE, selection: { [TroopCode.LEGIONNAIRE]: 3 }, cargo_load: 0, transport_capacity: 0 })).toEqual([])
  })

  it('explore and base take any troop, at least one', () => {
    expect(troopRestriction(EXPLORE, TroopCode.LEGIONNAIRE)).toBeNull()
    expect(troopRestriction(BASE, TroopCode.SETTLER)).toBeNull()
    expect(orderBlockers({ action: BASE, selection: {}, cargo_load: 0, transport_capacity: 0 })).toEqual([ 'Sélectionnez au moins une unité.' ])
    expect(orderBlockers({ action: undefined, selection: { [TroopCode.EXPLORER]: 1 }, cargo_load: 0, transport_capacity: 0 }))
      .toEqual([ 'Choisissez un ordre.' ])
  })

  it('transport needs a cargo within the capacity', () => {
    const selection = { [TroopCode.LIGHT_TRANSPORTER]: 1 }
    expect(orderBlockers({ action: TRANSPORT, selection, cargo_load: 0, transport_capacity: 100 })).toEqual([ 'Choisissez des ressources à transporter.' ])
    expect(orderBlockers({ action: TRANSPORT, selection, cargo_load: 101, transport_capacity: 100 })).toEqual([ 'La cargaison dépasse la capacité de transport.' ])
    expect(orderBlockers({ action: TRANSPORT, selection, cargo_load: 100, transport_capacity: 100 })).toEqual([])
  })

  it('switching action zeroes the rows it forbids and keeps the others', () => {
    const selection = { [TroopCode.EXPLORER]: 2, [TroopCode.LEGIONNAIRE]: 5, [TroopCode.LIGHT_TRANSPORTER]: 1 }
    expect(restrictSelection(selection, ATTACK)).toEqual({
      selection: { [TroopCode.LEGIONNAIRE]: 5, [TroopCode.LIGHT_TRANSPORTER]: 1 },
      removed: true,
    })
    expect(restrictSelection(selection, SPY)).toEqual({ selection: { [TroopCode.EXPLORER]: 2 }, removed: true })
    expect(restrictSelection(selection, TRANSPORT)).toEqual({ selection, removed: false })
  })
})

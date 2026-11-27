import { CombatStrategy, MovementAction, TroopCode, WORLD_SIZE } from '@eoneom/api-client'

import { pickSearchValue } from '#helpers/search'

/**
 * Send wizard state (slice 045). The route keeps it in the URL search params, the map drawer of slice 044 in a
 * `useState`: both parse and serialise it here so they validate the same way.
 */
export const MOVEMENT_SEND_STEPS = [ 'destination', 'ordre', 'recap' ] as const
export type MovementSendStep = typeof MOVEMENT_SEND_STEPS[number]

/** Every action a player can order; exchange convoys are created by the server only (slice 035). */
export type SendableAction = Exclude<MovementAction, MovementAction.EXCHANGE>
export const SENDABLE_ACTIONS: readonly SendableAction[] = [
  MovementAction.EXPLORE,
  MovementAction.BASE,
  MovementAction.TRANSPORT,
  MovementAction.ATTACK,
  MovementAction.SPY,
  MovementAction.REINFORCE,
]

export type TroopSelection = Partial<Record<TroopCode, number>>

export interface MovementSendCargo {
  plastic: number
  mushroom: number
  plasma: number
  water: number
}

export const EMPTY_CARGO: MovementSendCargo = { plastic: 0, mushroom: 0, plasma: 0, water: 0 }

export interface MovementSendState {
  /** Absent: `ordre` when the destination is set, else `destination` (see `resolveStep`). */
  step?: MovementSendStep
  x?: number
  y?: number
  action?: SendableAction
  troops: TroopSelection
  cargo: MovementSendCargo
  strategy?: CombatStrategy
}

/** URL shape of the state: `troops` is `code:count` pairs joined by `,`. */
export interface MovementSendSearch {
  step?: MovementSendStep
  x?: number
  y?: number
  action?: SendableAction
  troops?: string
  plastic?: number
  mushroom?: number
  plasma?: number
  water?: number
  strategy?: CombatStrategy
}

const CARGO_KEYS = [ 'plastic', 'mushroom', 'plasma', 'water' ] as const

const toInteger = (value: unknown): number | undefined => {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN
  return Number.isInteger(parsed) ? parsed : undefined
}

const toCoordinate = (value: unknown): number | undefined => {
  const parsed = toInteger(value)
  return parsed !== undefined && parsed >= 1 && parsed <= WORLD_SIZE ? parsed : undefined
}

const toAmount = (value: unknown): number => {
  const parsed = toInteger(value)
  return parsed !== undefined && parsed > 0 ? parsed : 0
}

/** `legionnaire:20,interceptor:5` → selection; unknown codes and counts ≤ 0 are dropped. */
export const parseTroops = (value: unknown): TroopSelection => {
  if (typeof value !== 'string') return {}
  const codes = Object.values(TroopCode) as string[]
  return value.split(',').reduce<TroopSelection>((selection, pair) => {
    const [ code, raw_count ] = pair.split(':')
    const count = toInteger(raw_count)
    if (!codes.includes(code) || count === undefined || count <= 0) return selection
    return { ...selection, [code]: count }
  }, {})
}

const serializeTroops = (selection: TroopSelection): string | undefined => {
  const pairs = selectedTroopList(selection).map(({ code, count }) => `${code}:${count}`)
  return pairs.length ? pairs.join(',') : undefined
}

/** Selected stacks with a positive count, in selection order. */
export const selectedTroopList = (selection: TroopSelection): { code: TroopCode; count: number }[] =>
  (Object.entries(selection) as [TroopCode, number | undefined][])
    .filter((entry): entry is [TroopCode, number] => (entry[1] ?? 0) > 0)
    .map(([ code, count ]) => ({ code, count }))

export const parseMovementSendSearch = (raw: Record<string, unknown>): MovementSendState => {
  const x = toCoordinate(raw.x)
  const y = toCoordinate(raw.y)
  const both = x !== undefined && y !== undefined
  return {
    step: pickSearchValue(MOVEMENT_SEND_STEPS, raw.step),
    x: both ? x : undefined,
    y: both ? y : undefined,
    action: pickSearchValue(SENDABLE_ACTIONS, raw.action),
    troops: parseTroops(raw.troops),
    cargo: {
      plastic: toAmount(raw.plastic),
      mushroom: toAmount(raw.mushroom),
      plasma: toAmount(raw.plasma),
      water: toAmount(raw.water),
    },
    strategy: pickSearchValue(Object.values(CombatStrategy), raw.strategy),
  }
}

/** Drops empty values so the URL only carries what the player chose. */
export const serializeMovementSendState = (state: MovementSendState): MovementSendSearch => {
  const search: MovementSendSearch = {}
  if (state.step) search.step = state.step
  if (state.x !== undefined && state.y !== undefined) {
    search.x = state.x
    search.y = state.y
  }
  if (state.action) search.action = state.action
  const troops = serializeTroops(state.troops)
  if (troops) search.troops = troops
  for (const key of CARGO_KEYS) {
    if (state.cargo[key] > 0) search[key] = state.cargo[key]
  }
  if (state.strategy) search.strategy = state.strategy
  return search
}

/** Route `validateSearch`: invalid values are dropped. */
export const validateMovementSendSearch = (raw: Record<string, unknown>): MovementSendSearch =>
  serializeMovementSendState(parseMovementSendSearch(raw))

export const hasDestination = (state: MovementSendState): state is MovementSendState & { x: number; y: number } =>
  state.x !== undefined && state.y !== undefined

/**
 * Step shown for a state: the default when absent, then the guards (`ordre` needs a destination, `recap` an action
 * and troops). Rules that need server data (destination kind, availability) are applied by the wizard.
 */
export const resolveStep = (state: MovementSendState): MovementSendStep => {
  const requested = state.step ?? (hasDestination(state) ? 'ordre' : 'destination')
  if (requested === 'destination' || !hasDestination(state)) return 'destination'
  if (requested === 'recap' && (!state.action || selectedTroopList(state.troops).length === 0)) return 'ordre'
  return requested
}

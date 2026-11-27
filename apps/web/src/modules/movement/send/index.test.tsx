import React, { useState } from 'react'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CombatStrategy,
  MovementAction,
  TechnologyCode,
  TroopCode,
  TroopMovementEstimateDataResponse,
} from '@eoneom/api-client'

import { MovementSendWizard } from '#movement/send'
import { MovementSendState, parseMovementSendSearch } from '#movement/send/search'
import { troopKeys } from '#troop/hooks'
import { technologyKeys } from '#technology/hooks'
import { cityKeys } from '#city/hooks'
import { outpostKeys } from '#outpost/hooks'
import { allianceKeys } from '#alliance/hooks'
import { destinationKeys, DestinationInfo } from '#movement/api/destination'
import { formatArrivalClock } from '#movement/clock'
import { FactionCode } from '@eoneom/api-client'

/** Slice 045: the send wizard with the URL store (props) and a local-state store (map drawer host). */

const mutate = vi.fn()
let estimate: TroopMovementEstimateDataResponse | undefined

vi.mock('#auth/context', () => ({ useAuth: () => ({ token: null }) }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
}))
vi.mock('#movement/api/estimate', () => ({
  useMovementEstimate: (input: unknown) => ({ data: input ? estimate : undefined, isFetching: false }),
}))
vi.mock('#troop/hooks', async (importOriginal) => ({
  ...await importOriginal<typeof import('#troop/hooks')>(),
  useCreateMovement: () => ({ mutate, isPending: false }),
}))

const NOW = new Date('2026-11-27T10:00:00').getTime()
const ENEMY = { x: 14, y: 9 }

const baseEstimate: TroopMovementEstimateDataResponse = {
  distance: 70_000,
  duration: 90,
  speed: 1.2,
  transport_capacity: 0,
  destination_capacity_exceeded: false,
  modifiers: { propulsion_level: 2, non_combat_speed_multiplier: 1, carrier_capacity_multiplier: 1 },
}

const troopEntry = (code: TroopCode, count: number, exchange_reserved = 0) => ({
  id: code,
  code,
  count,
  exchange_reserved,
  cost: { plastic: 0, mushroom: 0, plasma: 0, duration: 0 },
  requirement: { buildings: [], technologies: [] },
})

let queryClient: QueryClient
let store: Record<string, string>

const seed = ({ capacity = { used: 1, limit: 5 }, espionage = 1 } = {}) => {
  queryClient.setQueryData(cityKeys.detail('c1'), {
    id: 'c1',
    name: 'Alpha',
    coordinates: { x: 12, y: 7 },
    plastic: 1000,
    mushroom: 1000,
    plasma: 10,
    water: 100,
  })
  queryClient.setQueryData(troopKeys.cityList('c1'), {
    troops: [
      troopEntry(TroopCode.LEGIONNAIRE, 20),
      troopEntry(TroopCode.EXPLORER, 4),
      troopEntry(TroopCode.LIGHT_TRANSPORTER, 3, 1),
    ],
    recruit_queue: [],
    recruit_queue_limit: 0,
  })
  queryClient.setQueryData(troopKeys.movementCapacity, capacity)
  queryClient.setQueryData(technologyKeys.list(), {
    technologies: [ { code: TechnologyCode.ESPIONAGE, level: espionage } ],
    research_queue: [],
  })
  queryClient.setQueryData(cityKeys.all, { cities: [ { id: 'c1', name: 'Alpha', coordinates: { x: 12, y: 7 } } ], count_limit: 3 })
  queryClient.setQueryData(outpostKeys.all, { outposts: [], count_limit: 1 })
  queryClient.setQueryData(allianceKeys.mine, { viewer_player_id: 'me', cooldown_until: null, alliance: null })
  const enemy: DestinationInfo = {
    kind: 'enemy_city',
    settlement: { name: 'Brasier', alliance_tag: 'ABC', faction_code: FactionCode.THE_ASH_LITURGY },
  }
  queryClient.setQueryData([ ...destinationKeys.info(ENEMY), null ], enemy)
}

const wrap = (ui: React.ReactElement) => <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>

const recapState = (overrides: Record<string, unknown> = {}): MovementSendState => parseMovementSendSearch({
  step: 'recap',
  x: ENEMY.x,
  y: ENEMY.y,
  action: MovementAction.ATTACK,
  troops: `${TroopCode.LEGIONNAIRE}:5`,
  ...overrides,
})

describe('MovementSendWizard (slice 045)', () => {
  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    estimate = baseEstimate
    mutate.mockReset()
    store = {}
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('computes the arrival time from the duration in seconds (now + duration × 1000)', async () => {
    vi.useFakeTimers({ now: NOW })
    seed()
    render(wrap(
      <MovementSendWizard origin={{ kind: 'city', id: 'c1' }} state={recapState()} onStateChange={vi.fn()} onSent={vi.fn()} onCancel={vi.fn()} />
    ))

    expect(screen.getByTestId('estimated-arrival')).toHaveTextContent(formatArrivalClock(NOW + 90_000, NOW))
    expect(screen.getByTestId('estimated-arrival')).toHaveTextContent('10:01:30')
    expect(screen.getByText('Propulsion tactique niv. 2')).toBeInTheDocument()
    expect(screen.getByText('Attaquer — Ville ennemie [ABC] Brasier — Liturgie des cendres (14.9) depuis Alpha (12.7)')).toBeInTheDocument()

    // Refreshed every second.
    await act(async () => {
      vi.advanceTimersByTime(5_000)
    })
    expect(screen.getByTestId('estimated-arrival')).toHaveTextContent('10:01:35')
  })

  it('disables « Envoyer » with the blocking warning when the movement cap is reached', () => {
    seed({ capacity: { used: 5, limit: 5 } })
    render(wrap(
      <MovementSendWizard origin={{ kind: 'city', id: 'c1' }} state={recapState()} onStateChange={vi.fn()} onSent={vi.fn()} onCancel={vi.fn()} />
    ))

    expect(screen.getByRole('button', { name: 'Envoyer' })).toBeDisabled()
    expect(screen.getByText(/Limite de mouvements simultanés atteinte/)).toHaveAttribute('data-blocking', 'true')
  })

  it('sends the URL state, remembers the target and hands the new movement to onSent', async () => {
    seed()
    mutate.mockImplementation((_params, options: { onSuccess: (data: { movement_id: string }) => void }) => {
      options.onSuccess({ movement_id: 'new-movement' })
    })
    const onSent = vi.fn()
    render(wrap(
      <MovementSendWizard
        origin={{ kind: 'city', id: 'c1' }}
        state={recapState({ strategy: CombatStrategy.HOLD_THE_LINE, troops: `${TroopCode.LEGIONNAIRE}:50,${TroopCode.EXPLORER}:2` })}
        onStateChange={vi.fn()}
        onSent={onSent}
        onCancel={vi.fn()}
      />
    ))

    await userEvent.click(screen.getByRole('button', { name: 'Envoyer' }))

    // Counts clamped to the 20 available legionnaires; scouts are dropped from an attack.
    expect(mutate).toHaveBeenCalledWith({
      action: MovementAction.ATTACK,
      origin: { x: 12, y: 7 },
      destination: ENEMY,
      troops: [ { code: TroopCode.LEGIONNAIRE, count: 20 } ],
      resources: undefined,
      combat_strategy: CombatStrategy.HOLD_THE_LINE,
    }, expect.anything())
    expect(onSent).toHaveBeenCalledWith('new-movement')
    expect(JSON.parse(store['eoneom:movement:recent-targets:me'])[0]).toMatchObject({ coordinates: ENEMY, action: MovementAction.ATTACK })
  })

  it('falls back from « recap » to « ordre » without troops, replacing the URL', () => {
    seed()
    const onStateChange = vi.fn()
    render(wrap(
      <MovementSendWizard
        origin={{ kind: 'city', id: 'c1' }}
        state={recapState({ troops: undefined })}
        onStateChange={onStateChange}
        onSent={vi.fn()}
        onCancel={vi.fn()}
      />
    ))

    expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({ step: 'ordre' }), { push: false })
  })

  it('works with a local-state store (map drawer): prefill, action, troops, steps', async () => {
    seed({ espionage: 0 })
    const onSent = vi.fn()
    const Drawer: React.FC = () => {
      // The 044 drawer prefill `{ origin, destination, action? }`.
      const [ state, setState ] = useState<MovementSendState>(parseMovementSendSearch({ step: 'ordre', x: ENEMY.x, y: ENEMY.y }))
      return (
        <MovementSendWizard
          origin={{ kind: 'city', id: 'c1' }}
          state={state}
          onStateChange={next => setState(next)}
          onSent={onSent}
          onCancel={vi.fn()}
          layout="drawer"
        />
      )
    }
    render(wrap(<Drawer />))

    // Espionnage 0: « Espionner » is shown but disabled, so « Attaquer » is the only choice and is preselected.
    expect(screen.getByRole('radio', { name: /Espionner/ })).toBeDisabled()
    expect(screen.getByText('Recherchez l\'Espionnage pour envoyer des espions.')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Attaquer/ })).toBeChecked()

    // Scouts cannot attack.
    expect(screen.getByRole('spinbutton', { name: 'Explorateur' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Légionnaire : maximum' }))
    expect(screen.getByRole('spinbutton', { name: 'Légionnaire' })).toHaveValue(20)
    // Reserved carriers stay home: 3 − 1.
    expect(screen.getByRole('button', { name: 'Tout' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    expect(screen.getByRole('button', { name: 'Envoyer' })).toBeInTheDocument()
    // Drawer layout: the recap sits below the steps.
    expect(screen.getByRole('region', { name: 'Récapitulatif' })).toHaveTextContent('20 unités')

    await userEvent.click(within(screen.getByRole('list', { name: 'Étapes' })).getByRole('button', { name: '1 Destination' }))
    expect(screen.getByRole('spinbutton', { name: 'X' })).toHaveValue(ENEMY.x)
    expect(screen.getByRole('spinbutton', { name: 'Y' })).toHaveValue(ENEMY.y)
  })

  it('zeroes the troops the new action forbids and says so', async () => {
    seed({ espionage: 1 })
    const Host: React.FC = () => {
      const [ state, setState ] = useState<MovementSendState>(parseMovementSendSearch({
        step: 'ordre',
        x: ENEMY.x,
        y: ENEMY.y,
        action: MovementAction.SPY,
        troops: `${TroopCode.EXPLORER}:3`,
      }))
      return (
        <MovementSendWizard origin={{ kind: 'city', id: 'c1' }} state={state} onStateChange={setState} onSent={vi.fn()} onCancel={vi.fn()} />
      )
    }
    render(wrap(<Host />))

    expect(screen.getByRole('spinbutton', { name: 'Explorateur' })).toHaveValue(3)
    await userEvent.click(screen.getByRole('radio', { name: /Attaquer/ }))
    expect(screen.getByText('Les troupes non autorisées pour cet ordre ont été retirées.')).toBeInTheDocument()
    expect(screen.getByRole('spinbutton', { name: 'Explorateur' })).toHaveValue(0)
  })
})

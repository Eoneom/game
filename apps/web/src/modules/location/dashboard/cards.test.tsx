import React from 'react'
import { act, render, renderHook, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CombatStrategy,
  FactionCode,
  MovementAction,
  MovementKind,
  OutpostType,
  TechnologyCode,
  TroopCode,
  TroopIncomingMovement,
} from '@eoneom/api-client'

import { cityKeys } from '#city/hooks'
import { outpostKeys } from '#outpost/hooks'
import { technologyKeys } from '#technology/hooks'
import { troopKeys } from '#troop/hooks'
import type { City, MovementItem, Outpost } from '#types'

import { DashboardCard } from './card'
import { IncomingAlert } from './incoming-alert'
import { LocationMovementsCard } from './movements-card'
import { CityProductionCard, OutpostProductionCard } from './production-card'
import { COUNTDOWN_REFETCH_DELAY_MS, useCountdownRefetch } from './refetch'

/** Slice 042: shared dashboard cards (frame, production, movements, incoming alert) and the refetch fallback. */

const openPanel = vi.fn()

vi.mock('#auth/context', () => ({ useAuth: () => ({ token: null }) }))
vi.mock('#ui/header/resources/context', () => ({ useResourcePanel: () => ({ open: openPanel }) }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, search, className }: {
    children: React.ReactNode
    to: string
    params?: Record<string, string>
    search?: Record<string, string>
    className?: string
  }) => {
    const path = Object.entries(params ?? {}).reduce((href, [ key, value ]) => href.replace(`$${key}`, value), to)
    return <a className={className} href={search ? `${path}?${new URLSearchParams(search).toString()}` : path}>{children}</a>
  },
}))

const NOW = new Date('2026-11-27T10:00:00').getTime()

const city = (overrides: Partial<City> = {}): City => ({
  id: 'c1',
  name: 'Nouvelle-Rouille',
  default_combat_strategy: CombatStrategy.BALANCED,
  plastic: 12480,
  mushroom: 8210,
  plasma: 340,
  water: 1200,
  maximum_building_levels: 40,
  building_levels_used: 34,
  coordinates: { x: 12, y: 7 },
  earnings_per_second: { plastic: 0.35, mushroom: 0.27, plasma: 0.01, water: 0.004 },
  pre_cell_earnings_per_second: { plastic: 0.35, mushroom: 0.27, plasma: 0.01, water: 0.004 },
  cell_resource_coefficient: { plastic: 1, mushroom: 1 },
  technology_production_multiplier: { plastic: 1, mushroom: 1, plasma: 1, water: 1 },
  faction_production_multiplier: { plastic: 1, mushroom: 1 },
  warehouses_capacity: { plastic: 20000, mushroom: 20000 },
  warehouse_space_remaining: { plastic: 7520, mushroom: 11790 },
  warehouse_full_in_seconds: { plastic: 11400, mushroom: 21720 },
  energy: 150,
  pre_cell_energy: 150,
  neutral_photovoltaic_energy: 150,
  cell_solar_coefficient: 1,
  photovoltaic_optimization_level: 0,
  energy_consumption: 120,
  production_energy_ratio: 1,
  ...overrides,
})

const outpost = (overrides: Partial<Outpost> = {}): Outpost => ({
  id: 'o1',
  coordinates: { x: 5, y: 6 },
  type: OutpostType.PERMANENT,
  default_combat_strategy: CombatStrategy.BALANCED,
  plastic: 1000,
  mushroom: 1500,
  plasma: 3,
  earnings_per_second: { plastic: 0.2, mushroom: 0.1, plasma: 0 },
  pre_cell_earnings_per_second: { plastic: 0.2, mushroom: 0.1, plasma: 0 },
  cell_resource_coefficient: { plastic: 1, mushroom: 1 },
  technology_production_multiplier: { plastic: 1, mushroom: 1, plasma: 1 },
  faction_production_multiplier: { plastic: 1, mushroom: 1 },
  warehouses_capacity: { plastic: 2000, mushroom: 1500 },
  warehouse_full_in_seconds: { plastic: 5000, mushroom: 0 },
  ...overrides,
})

const movement = (overrides: Partial<MovementItem>): MovementItem => ({
  id: 'm1',
  action: MovementAction.ATTACK,
  kind: MovementKind.OUTGOING,
  departure_at: 0,
  origin: { x: 12, y: 7 },
  destination: { x: 15, y: 2 },
  arrive_at: NOW + 344_000,
  battle_id: null,
  resources: { plastic: 0, mushroom: 0, plasma: 0, water: 0 },
  troops: [ { code: TroopCode.EXPLORER, count: 2 } ],
  ...overrides,
})

const incoming = (overrides: Partial<TroopIncomingMovement> = {}): TroopIncomingMovement => ({
  id: 'i1',
  target: { kind: 'city', id: 'c1', name: 'Nouvelle-Rouille', coordinates: { x: 12, y: 7 } },
  arrive_at: NOW + 190_000,
  ...overrides,
})

let queryClient: QueryClient

const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)

const seedMovements = ({
  movements = [],
  incomings = [],
  detection = 1,
}: { movements?: MovementItem[], incomings?: TroopIncomingMovement[], detection?: number }) => {
  queryClient.setQueryData(troopKeys.movements, movements)
  queryClient.setQueryData(troopKeys.incomingMovements, incomings)
  queryClient.setQueryData(troopKeys.movementCapacity, { used: 3, limit: 7 })
  queryClient.setQueryData(technologyKeys.list('c1'), {
    technologies: [ { id: 't', code: TechnologyCode.DETECTION, level: detection, requirement: { buildings: [], technologies: [] } } ],
    research_queue: [],
  })
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  openPanel.mockReset()
  vi.useFakeTimers({ toFake: [ 'Date' ] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('DashboardCard', () => {
  it('links its title to the full page', () => {
    wrap(<DashboardCard title="Construction" to="/city/$cityId/base/building" params={{ cityId: 'c1' }} state="ready">body</DashboardCard>)

    const heading = screen.getByRole('heading', { level: 2, name: /Construction/ })
    expect(within(heading).getByRole('link')).toHaveAttribute('href', '/city/c1/base/building')
    expect(screen.getByRole('region', { name: /Construction/ })).toHaveTextContent('body')
  })

  it('shows a busy skeleton while loading, with the title link usable', () => {
    wrap(<DashboardCard title="Recherche" to="/city/$cityId/base/technology" params={{ cityId: 'c1' }} state="loading">body</DashboardCard>)

    const region = screen.getByRole('region', { name: /Recherche/ })
    expect(region).toHaveAttribute('aria-busy', 'true')
    expect(within(region).getByTestId('dashboard-card-skeleton').children).toHaveLength(3)
    expect(region).not.toHaveTextContent('body')
    expect(within(region).getByRole('link')).toBeInTheDocument()
  })

  it('shows the error state and retries', async () => {
    const onRetry = vi.fn()
    vi.useRealTimers()
    wrap(<DashboardCard title="Défense" state="error" onRetry={onRetry}>body</DashboardCard>)

    expect(screen.getByText('Données indisponibles.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('marks the alert tone', () => {
    wrap(<DashboardCard title="Attaques entrantes" tone="alert" state="ready" role="status">x</DashboardCard>)

    expect(screen.getByRole('status')).toHaveClass('border-danger')
    expect(screen.getByRole('heading', { name: 'Attaques entrantes' })).toHaveClass('text-danger')
  })
})

describe('CityProductionCard', () => {
  it('shows stocks, hourly rates, warehouse fill and time until full', () => {
    queryClient.setQueryData(cityKeys.detail('c1'), city())
    wrap(<CityProductionCard cityId="c1" />)

    const plastic = screen.getByRole('rowheader', { name: /Plastique/ }).closest('tr') as HTMLElement
    expect(plastic).toHaveTextContent('12.48k')
    expect(plastic).toHaveTextContent('~1.26k/h')
    expect(within(plastic).getByRole('progressbar', { name: 'Entrepôt plastique' })).toHaveAttribute('aria-valuenow', '62')
    expect(plastic).toHaveTextContent('~3 h 10')
    expect(within(plastic).getByRole('progressbar').firstElementChild).toHaveClass('bg-amber')

    const plasma = screen.getByRole('rowheader', { name: /Plasma/ }).closest('tr') as HTMLElement
    expect(plasma).toHaveTextContent('illimité')
    const water = screen.getByRole('rowheader', { name: /Eau pure/ }).closest('tr') as HTMLElement
    expect(water).toHaveTextContent('illimité')
  })

  it('turns a warehouse from 90 % red and reads « plein » at 100 %', () => {
    queryClient.setQueryData(cityKeys.detail('c1'), city({
      warehouse_space_remaining: { plastic: 1000, mushroom: 0 },
      warehouse_full_in_seconds: { plastic: 2000, mushroom: 0 },
    }))
    wrap(<CityProductionCard cityId="c1" />)

    const plastic = screen.getByRole('rowheader', { name: /Plastique/ }).closest('tr') as HTMLElement
    expect(within(plastic).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '95')
    expect(within(plastic).getByRole('progressbar').firstElementChild).toHaveClass('bg-danger')
    const mushroom = screen.getByRole('rowheader', { name: /Champignon/ }).closest('tr') as HTMLElement
    expect(mushroom).toHaveTextContent('plein')
  })

  it('warns when production is reduced by missing energy', () => {
    queryClient.setQueryData(cityKeys.detail('c1'), city({ production_energy_ratio: 0.8 }))
    wrap(<CityProductionCard cityId="c1" />)

    expect(screen.getByText('Production réduite à 80 % par manque d\'énergie.')).toHaveClass('text-danger')
  })

  it('opens the header resource panel', async () => {
    vi.useRealTimers()
    queryClient.setQueryData(cityKeys.detail('c1'), city())
    wrap(<CityProductionCard cityId="c1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Détail de la production' }))
    expect(openPanel).toHaveBeenCalledTimes(1)
  })
})

describe('OutpostProductionCard', () => {
  it('shows production only for a permanent outpost', () => {
    queryClient.setQueryData(outpostKeys.detail('o1'), outpost({ type: OutpostType.TEMPORARY }))
    wrap(<OutpostProductionCard outpostId="o1" />)

    const plastic = screen.getByRole('rowheader', { name: /Plastique/ }).closest('tr') as HTMLElement
    expect(plastic).not.toHaveTextContent('/h')
    expect(within(plastic).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50')
    const mushroom = screen.getByRole('rowheader', { name: /Champignon/ }).closest('tr') as HTMLElement
    expect(mushroom).toHaveTextContent('plein')
    expect(screen.queryByRole('rowheader', { name: /Eau pure/ })).not.toBeInTheDocument()
  })
})

describe('LocationMovementsCard', () => {
  const origin = { kind: 'city' as const, id: 'c1' }

  it('counts this city\'s movements and lists the next 5 arrivals, incoming attacks in danger', () => {
    seedMovements({
      movements: [
        movement({ id: 'out-1', arrive_at: NOW + 344_000 }),
        movement({ id: 'out-2', action: MovementAction.SPY, arrive_at: NOW + 900_000 }),
        movement({ id: 'ret', kind: MovementKind.RETURN, action: MovementAction.BASE, origin: { x: 15, y: 2 }, destination: { x: 12, y: 7 }, arrive_at: NOW + 750_000 }),
        movement({ id: 'conv', kind: MovementKind.CONVOY, action: MovementAction.EXCHANGE, destination: { x: 9, y: 4 }, arrive_at: NOW + 1_200_000 }),
        movement({ id: 'out-3', action: MovementAction.EXPLORE, arrive_at: NOW + 2_000_000 }),
        movement({ id: 'other', origin: { x: 1, y: 1 }, arrive_at: NOW + 10_000 }),
      ],
      incomings: [ incoming(), incoming({ id: 'i2', target: { kind: 'city', id: 'c2', name: 'Autre', coordinates: { x: 9, y: 4 } } }) ],
    })
    wrap(<LocationMovementsCard origin={origin} coordinates={{ x: 12, y: 7 }} />)

    const region = screen.getByRole('region', { name: /Mouvements/ })
    expect(region).toHaveTextContent('Sortants 3')
    expect(region).toHaveTextContent('Retours 1')
    expect(region).toHaveTextContent('Convois 1')
    expect(region).toHaveTextContent('Entrants 1')
    expect(screen.getByRole('meter', { name: 'Mouvements simultanés' })).toHaveAttribute('aria-valuenow', '3')

    const rows = within(region).getAllByRole('row').slice(1)
    expect(rows.map(row => row.firstElementChild?.textContent)).toEqual([
      'Attaque entrante',
      'Attaquer',
      'Retour',
      'Espionner',
      'Convoi de bourse',
    ])
    expect(rows[0].firstElementChild).toHaveClass('text-danger')
    expect(rows[0]).toHaveTextContent('? → 12.7')
    expect(rows[0]).toHaveTextContent('03:10')
    expect(rows[1]).toHaveTextContent('12.7 → 15.2')
    expect(within(region).getByRole('link', { name: '+1 autre' })).toHaveAttribute('href', '/city/c1/world/movement')
    expect(within(region).getByRole('heading', { name: /Mouvements/ }).querySelector('a')).toHaveAttribute('href', '/city/c1/world/movement')
  })

  it('reads « Détection requise » instead of an incoming count at detection 0', () => {
    seedMovements({ movements: [ movement({}) ], detection: 0 })
    wrap(<LocationMovementsCard origin={origin} coordinates={{ x: 12, y: 7 }} />)

    expect(screen.getByRole('region', { name: /Mouvements/ })).toHaveTextContent('Entrants Détection requise')
  })

  it('shows the empty state with a link to the send wizard', () => {
    seedMovements({})
    wrap(<LocationMovementsCard origin={origin} coordinates={{ x: 12, y: 7 }} />)

    expect(screen.getByText(/Aucun mouvement en cours depuis ou vers cette ville\./)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Envoyer des troupes' })).toHaveAttribute('href', '/city/c1/world/movement/send')
  })

  it('stays loading until the location coordinates are known', () => {
    seedMovements({})
    wrap(<LocationMovementsCard origin={origin} coordinates={undefined} />)

    expect(screen.getByRole('region', { name: /Mouvements/ })).toHaveAttribute('aria-busy', 'true')
  })
})

describe('IncomingAlert', () => {
  const location = { kind: 'city' as const, id: 'c1' }

  it('is hidden without an attack on this city', () => {
    queryClient.setQueryData(troopKeys.incomingMovements, [
      incoming({ target: { kind: 'city', id: 'c2', name: 'Autre', coordinates: { x: 9, y: 4 } } }),
    ])
    wrap(<IncomingAlert location={location} />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('counts the attacks on this city with the first arrival, without attacker details below detection 2', () => {
    queryClient.setQueryData(troopKeys.incomingMovements, [
      incoming({ id: 'late', arrive_at: NOW + 600_000 }),
      incoming(),
    ])
    wrap(<IncomingAlert location={location} />)

    const alert = screen.getByRole('status')
    expect(alert).toHaveTextContent('2 attaques vers cette ville')
    expect(alert).toHaveTextContent('première arrivée 03:10')
    expect(alert).not.toHaveTextContent('unité')
    expect(within(alert).getByRole('link', { name: 'Voir les déplacements' })).toHaveAttribute('href', '/city/c1/world/movement?tab=entrants')
  })

  it('names the attacker and the army size when the detection reveals them', () => {
    queryClient.setQueryData(troopKeys.incomingMovements, [
      incoming({ attacker: { name: 'Krask', faction_code: FactionCode.THE_ASH_LITURGY }, unit_count: 40 }),
    ])
    wrap(<IncomingAlert location={location} />)

    const alert = screen.getByRole('status')
    expect(alert).toHaveTextContent('1 attaque vers cette ville')
    expect(alert).toHaveTextContent('Krask')
    expect(alert).toHaveTextContent('≈ 40 unités')
  })
})

describe('useCountdownRefetch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  const renderRefetch = () => renderHook(() => useCountdownRefetch([ 'buildings', 'c1' ]), {
    wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  })

  it('invalidates the query once, 3 s after the countdown ends without an event', () => {
    queryClient.setQueryData([ 'buildings', 'c1' ], { n: 1 })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderRefetch()

    act(() => result.current())
    act(() => result.current())
    act(() => { vi.advanceTimersByTime(COUNTDOWN_REFETCH_DELAY_MS - 1) })
    expect(invalidate).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1) })
    expect(invalidate).toHaveBeenCalledTimes(1)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: [ 'buildings', 'c1' ] })
  })

  it('does nothing when an event refreshed the data meanwhile', () => {
    queryClient.setQueryData([ 'buildings', 'c1' ], { n: 1 })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderRefetch()

    act(() => result.current())
    act(() => { vi.advanceTimersByTime(1000) })
    act(() => { queryClient.setQueryData([ 'buildings', 'c1' ], { n: 2 }) })
    act(() => { vi.advanceTimersByTime(COUNTDOWN_REFETCH_DELAY_MS) })
    expect(invalidate).not.toHaveBeenCalled()
  })
})

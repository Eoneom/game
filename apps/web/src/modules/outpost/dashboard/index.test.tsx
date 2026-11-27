import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CombatStrategy,
  MovementAction,
  MovementKind,
  OutpostType,
  TechnologyCode,
  TroopCode,
  TroopIncomingMovement,
} from '@eoneom/api-client'

import { outpostKeys } from '#outpost/hooks'
import { technologyKeys } from '#technology/hooks'
import { troopKeys } from '#troop/hooks'
import type { MovementItem, Outpost } from '#types'

import { OutpostDashboard } from './index'

/** Slice 042: the outpost home is a reduced dashboard (alert, stocks, status, garrison, movements). */

const mockSettleCity = vi.fn()
const mockSetPermanent = vi.fn()
const mockSetCombatStrategy = vi.fn()

vi.mock('#auth/context', () => ({ useAuth: () => ({ token: null }) }))
vi.mock('#ui/header/resources/context', () => ({ useResourcePanel: () => ({ open: vi.fn() }) }))
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
vi.mock('#outpost/hooks', async () => ({
  ...(await vi.importActual<typeof import('#outpost/hooks')>('#outpost/hooks')),
  useSetOutpostPermanent: () => ({ mutate: mockSetPermanent }),
  useSetOutpostCombatStrategy: () => ({ mutate: mockSetCombatStrategy, isPending: false }),
}))
vi.mock('#city/hooks', async () => ({
  ...(await vi.importActual<typeof import('#city/hooks')>('#city/hooks')),
  useSettleCity: () => ({ mutate: mockSettleCity }),
}))
vi.mock('#outpost/settle', () => ({
  OutpostSettle: ({ onSettle }: { onSettle: (name: string) => void }) => (
    <button onClick={() => onSettle('CityName')}>Settle</button>
  ),
}))

const NOW = Date.now()

const outpost = (overrides: Partial<Outpost> = {}): Outpost => ({
  id: 'o1',
  coordinates: { x: 5, y: 6 },
  type: OutpostType.TEMPORARY,
  default_combat_strategy: CombatStrategy.BALANCED,
  plastic: 10,
  mushroom: 20,
  plasma: 0,
  earnings_per_second: { plastic: 0, mushroom: 0, plasma: 0 },
  pre_cell_earnings_per_second: { plastic: 0, mushroom: 0, plasma: 0 },
  cell_resource_coefficient: { plastic: 1, mushroom: 1 },
  technology_production_multiplier: { plastic: 1, mushroom: 1, plasma: 1 },
  faction_production_multiplier: { plastic: 1, mushroom: 1 },
  warehouses_capacity: { plastic: 2000, mushroom: 1500 },
  warehouse_full_in_seconds: { plastic: 0, mushroom: 0 },
  ...overrides,
})

const movement = (overrides: Partial<MovementItem>): MovementItem => ({
  id: 'm1',
  action: MovementAction.EXPLORE,
  kind: MovementKind.OUTGOING,
  origin: { x: 5, y: 6 },
  destination: { x: 10, y: 10 },
  arrive_at: NOW + 600_000,
  battle_id: null,
  resources: { plastic: 0, mushroom: 0, plasma: 0, water: 0 },
  troops: [ { code: TroopCode.EXPLORER, count: 2 } ],
  ...overrides,
})

let queryClient: QueryClient

const renderDashboard = (data: Outpost, incomings: TroopIncomingMovement[] = []) => {
  queryClient.setQueryData(outpostKeys.detail('o1'), data)
  queryClient.setQueryData(troopKeys.outpostList('o1'), [
    { id: 't1', code: TroopCode.EXPLORER, count: 7, exchange_reserved: 0 },
    { id: 't2', code: TroopCode.SETTLER, count: 1, exchange_reserved: 0 },
  ])
  queryClient.setQueryData(troopKeys.movements, [
    movement({ id: 'here' }),
    movement({ id: 'city', origin: { x: 1, y: 1 } }),
  ])
  queryClient.setQueryData(troopKeys.incomingMovements, incomings)
  queryClient.setQueryData(troopKeys.movementCapacity, { used: 2, limit: 5 })
  queryClient.setQueryData(technologyKeys.list(), {
    technologies: [ { id: 'd', code: TechnologyCode.DETECTION, level: 1, requirement: { buildings: [], technologies: [] } } ],
    research_queue: [],
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <OutpostDashboard outpostId="o1" />
    </QueryClientProvider>
  )
}

describe('OutpostDashboard', () => {
  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    mockSettleCity.mockReset()
    mockSetPermanent.mockReset()
    mockSetCombatStrategy.mockReset()
  })

  it('renders the outpost cards only, without the city cards', () => {
    renderDashboard(outpost())

    expect(screen.getByRole('heading', { level: 1, name: 'Avant-poste' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 }).parentElement).toHaveTextContent('Avant-poste5.6')
    expect(screen.getAllByRole('heading', { level: 2 }).map(heading => heading.textContent?.replace(' →', ''))).toEqual([
      'Stocks et production',
      'Statut',
      'Garnison',
      'Mouvements',
    ])
    for (const name of [ 'Énergie', 'Construction', 'Recherche', 'Recrutement', 'Fortification', 'Défense', 'Bourse' ]) {
      expect(screen.queryByRole('heading', { name: new RegExp(name) })).not.toBeInTheDocument()
    }
    expect(screen.queryByRole('link', { name: 'Carte' })).not.toBeInTheDocument()
  })

  it('offers « Rendre permanent » and the settle form for a temporary outpost', async () => {
    renderDashboard(outpost())

    const status = screen.getByRole('region', { name: 'Statut' })
    expect(status).toHaveTextContent('Type Temporaire')
    await userEvent.click(within(status).getByRole('button', { name: 'Rendre permanent' }))
    expect(mockSetPermanent).toHaveBeenCalledTimes(1)
    await userEvent.click(within(status).getByRole('button', { name: 'Settle' }))
    expect(mockSettleCity).toHaveBeenCalledWith('CityName')
  })

  it('shows the permanent status and production', () => {
    renderDashboard(outpost({ type: OutpostType.PERMANENT, earnings_per_second: { plastic: 0.5, mushroom: 0.1, plasma: 0 } }))

    const status = screen.getByRole('region', { name: 'Statut' })
    expect(status).toHaveTextContent('Type Permanent')
    expect(status).toHaveTextContent('Avant-poste permanent — production active.')
    expect(within(status).queryByRole('button', { name: 'Rendre permanent' })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: /Stocks et production/ })).toHaveTextContent('~1.8k/h')
  })

  it('shows the garrison size and dispatches a strategy change', async () => {
    renderDashboard(outpost({ default_combat_strategy: CombatStrategy.HOLD_THE_LINE }))

    const garrison = screen.getByRole('region', { name: /Garnison/ })
    expect(garrison).toHaveTextContent('8 unités stationnées')
    expect(within(garrison).getByRole('radio', { name: 'Tenir la ligne' })).toBeChecked()
    expect(within(garrison).getByRole('link')).toHaveAttribute('href', '/outpost/o1/troop')
    await userEvent.click(within(garrison).getByRole('radio', { name: 'Frappe d\'ouverture' }))
    expect(mockSetCombatStrategy).toHaveBeenCalledWith(CombatStrategy.OPENING_STRIKE)
  })

  it('filters the movements on the outpost and links to its movements page', () => {
    renderDashboard(outpost())

    const card = screen.getByRole('region', { name: /Mouvements/ })
    expect(card).toHaveTextContent('Sortants 1')
    expect(within(card).getAllByRole('row')).toHaveLength(2)
    expect(within(card).getByRole('heading', { name: /Mouvements/ }).querySelector('a')).toHaveAttribute('href', '/outpost/o1/world/movement')
  })

  it('shows the alert only for attacks on this outpost', () => {
    const attack = (id: string, kind: 'city' | 'outpost', targetId: string): TroopIncomingMovement => ({
      id,
      target: { kind, id: targetId, name: null, coordinates: { x: 5, y: 6 } },
      arrive_at: NOW + 60_000,
    })
    renderDashboard(outpost(), [ attack('i1', 'outpost', 'o1'), attack('i2', 'outpost', 'o2'), attack('i3', 'city', 'o1') ])

    expect(screen.getByRole('status')).toHaveTextContent('1 attaque vers cet avant-poste')
    expect(screen.getByRole('region', { name: /Mouvements/ })).toHaveTextContent('Entrants 1')
  })
})

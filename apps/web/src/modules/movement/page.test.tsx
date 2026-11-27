import React from 'react'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  FactionCode,
  MovementAction,
  MovementKind,
  TechnologyCode,
  TroopCode,
  TroopIncomingMovement,
} from '@eoneom/api-client'

import { MovementPage } from '#movement/page'
import { troopKeys } from '#troop/hooks'
import { technologyKeys } from '#technology/hooks'
import { cityKeys } from '#city/hooks'
import { outpostKeys } from '#outpost/hooks'
import { allianceKeys } from '#alliance/hooks'
import type { MovementItem } from '#types'

/** Slice 045: tabs, counts, empty states and the arrival refetch of the movements page. */

const navigate = vi.fn()

vi.mock('#auth/context', () => ({ useAuth: () => ({ token: null }) }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search, className }: {
    children: React.ReactNode
    to: string
    search?: Record<string, string>
    className?: string
  }) => (
    <a className={className} href={search ? `${to}?${new URLSearchParams(search).toString()}` : to}>{children}</a>
  ),
  useNavigate: () => navigate,
}))

const NOW = new Date('2026-11-27T10:00:00').getTime()

const movement = (overrides: Partial<MovementItem>): MovementItem => ({
  id: 'm1',
  action: MovementAction.EXPLORE,
  kind: MovementKind.OUTGOING,
  origin: { x: 3, y: 4 },
  destination: { x: 10, y: 10 },
  arrive_at: NOW + 600_000,
  battle_id: null,
  resources: { plastic: 0, mushroom: 0, plasma: 0, water: 0 },
  troops: [ { code: TroopCode.EXPLORER, count: 2 } ],
  ...overrides,
})

const incoming: TroopIncomingMovement = {
  id: 'i1',
  target: { kind: 'city', id: 'c1', name: 'Alpha', coordinates: { x: 3, y: 4 } },
  arrive_at: NOW + 120_000,
  attacker: { name: 'Brute', faction_code: FactionCode.THE_ASH_LITURGY },
}

const technologies = (detection: number) => ({
  technologies: [ { code: TechnologyCode.DETECTION, level: detection } ],
  research_queue: [],
})

let queryClient: QueryClient

const seed = ({
  movements = [],
  incomings = [],
  detection = 1,
  capacity = { used: 1, limit: 5 },
}: {
  movements?: MovementItem[]
  incomings?: TroopIncomingMovement[]
  detection?: number
  capacity?: { used: number; limit: number }
}) => {
  queryClient.setQueryData(troopKeys.movements, movements)
  queryClient.setQueryData(troopKeys.incomingMovements, incomings)
  queryClient.setQueryData(troopKeys.movementCapacity, capacity)
  queryClient.setQueryData(technologyKeys.list(), technologies(detection))
  queryClient.setQueryData(cityKeys.all, { cities: [ { id: 'c1', name: 'Alpha', coordinates: { x: 3, y: 4 } } ], count_limit: 3 })
  queryClient.setQueryData(outpostKeys.all, { outposts: [], count_limit: 1 })
  queryClient.setQueryData(allianceKeys.mine, { viewer_player_id: 'me', cooldown_until: null, alliance: null })
}

const renderPage = (search: React.ComponentProps<typeof MovementPage>['search'] = {}) => render(
  <QueryClientProvider client={queryClient}>
    <MovementPage cityId="c1" search={search} />
  </QueryClientProvider>
)

describe('MovementPage (slice 045)', () => {
  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    navigate.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows each tab with its row count and turns « Entrants » red when attacks come', () => {
    seed({
      movements: [
        movement({ id: 'out-1' }),
        movement({ id: 'out-2', action: MovementAction.ATTACK }),
        movement({ id: 'ret', kind: MovementKind.RETURN, action: MovementAction.BASE }),
        movement({ id: 'conv', kind: MovementKind.CONVOY, action: MovementAction.EXCHANGE }),
      ],
      incomings: [ incoming ],
    })
    renderPage()

    expect(screen.getByRole('tab', { name: 'Sortants (2)' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Entrants (1)' })).toHaveClass('text-danger')
    expect(screen.getByRole('tab', { name: 'Retours (1)' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Convois (1)' })).toBeInTheDocument()
    // « Sortants »: one row per outgoing movement, own city named.
    const rows = within(screen.getByRole('tabpanel')).getAllByRole('row')
    expect(rows).toHaveLength(3)
    expect(rows[1]).toHaveTextContent('Explorer')
    expect(rows[1]).toHaveTextContent('Alpha (3.4)')
    expect(rows[1]).toHaveTextContent('2 unités')
  })

  it('labels returns « Retour » and convoys by their leg', () => {
    seed({
      movements: [
        movement({ id: 'ret', kind: MovementKind.RETURN, action: MovementAction.BASE }),
        movement({ id: 'conv', kind: MovementKind.CONVOY, action: MovementAction.EXCHANGE }),
        movement({ id: 'carriers', kind: MovementKind.CONVOY, action: MovementAction.BASE, arrive_at: NOW + 900_000 }),
      ],
    })
    const { unmount } = renderPage({ tab: 'retours' })
    expect(within(screen.getByRole('tabpanel')).getAllByRole('row')[1]).toHaveTextContent('Retour')
    unmount()

    renderPage({ tab: 'convois' })
    const rows = within(screen.getByRole('tabpanel')).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Livraison')
    expect(rows[2]).toHaveTextContent('Retour des transporteurs')
  })

  it('shows the empty state of each tab', () => {
    seed({ detection: 0 })
    const { unmount } = renderPage()
    expect(screen.getByText('Aucun déplacement en cours.')).toBeInTheDocument()
    expect(within(screen.getByRole('tabpanel')).getByRole('link', { name: 'Envoyer des troupes' }))
      .toHaveAttribute('href', '/city/c1/world/movement/send')
    unmount()

    renderPage({ tab: 'entrants' })
    expect(screen.getByRole('link', { name: 'Recherchez la Détection' }))
      .toHaveAttribute('href', `/city/c1/base/technology?code=${TechnologyCode.DETECTION}`)
  })

  it('says no attack is detected once Détection is researched', () => {
    seed({ detection: 1 })
    renderPage({ tab: 'entrants' })
    expect(screen.getByText('Aucune attaque détectée.')).toBeInTheDocument()
  })

  it('shows convoy and return empty states', () => {
    seed({})
    const { unmount } = renderPage({ tab: 'retours' })
    expect(screen.getByText('Aucune troupe sur le chemin du retour.')).toBeInTheDocument()
    unmount()
    renderPage({ tab: 'convois' })
    expect(screen.getByText('Aucun convoi de bourse en route.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ouvrir la bourse' })).toHaveAttribute('href', '/exchange')
  })

  it('shows the cap meter and the hint when the cap is reached', () => {
    seed({ capacity: { used: 7, limit: 7 } })
    renderPage()
    expect(screen.getByRole('meter', { name: 'Mouvements simultanés' })).toHaveAttribute('title', expect.stringContaining('Les convois de bourse ne comptent pas.'))
    expect(screen.getByText('Limite atteinte : attendez un retour ou améliorez un centre de commandement.')).toBeInTheDocument()
  })

  it('refetches the list once, 1 s after a countdown reaches 0', async () => {
    vi.useFakeTimers({ now: NOW })
    seed({ movements: [ movement({ id: 'soon', arrive_at: NOW + 2_000 }) ] })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    renderPage()

    await act(async () => {
      vi.advanceTimersByTime(2_000)
    })
    expect(screen.getByText('Arrivée…')).toBeInTheDocument()
    expect(invalidate).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(1_000)
    })
    expect(invalidate).toHaveBeenCalledTimes(1)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: troopKeys.movements })

    await act(async () => {
      vi.advanceTimersByTime(5_000)
    })
    expect(invalidate).toHaveBeenCalledTimes(1)
  })

  it('opens a movement and switches tabs through the URL', async () => {
    seed({ movements: [ movement({ id: 'm1' }) ], incomings: [ incoming ] })
    renderPage({ sort: '-arrival' })

    await userEvent.click(within(screen.getByRole('tabpanel')).getAllByRole('row')[1])
    expect(navigate).toHaveBeenLastCalledWith({ to: '/city/c1/world/movement/m1', search: { tab: undefined, sort: '-arrival' } })

    await userEvent.click(screen.getByRole('tab', { name: 'Entrants (1)' }))
    expect(navigate).toHaveBeenLastCalledWith({
      to: '/city/c1/world/movement',
      search: { tab: 'entrants', sort: '-arrival', incoming: undefined },
      replace: true,
    })
  })

  it('shows an incoming attack in the details panel from the cached list', () => {
    seed({ incomings: [ incoming ] })
    renderPage({ tab: 'entrants', incoming: 'i1' })
    expect(screen.getByRole('heading', { name: 'Attaque entrante' })).toBeInTheDocument()
    expect(screen.getByText('Ces informations dépendent de votre niveau de Détection.')).toBeInTheDocument()
  })

  it('shows the empty details panel without a selection', () => {
    seed({})
    renderPage()
    expect(screen.getByText('Sélectionnez un mouvement pour voir son détail.')).toBeInTheDocument()
  })
})

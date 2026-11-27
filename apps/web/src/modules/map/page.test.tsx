import React from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { FactionCode, MovementAction, WORLD_SIZE } from '@eoneom/api-client'

import { MapPage } from '#map/page'

const NOW = Date.now()

const data = vi.hoisted(() => ({
  incoming: [] as unknown[],
  espionage: 1,
}))

vi.mock('react-konva', () => ({
  Stage: ({ children }: { children: React.ReactNode }) => <div data-testid="stage">{children}</div>,
  Layer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Shape: () => null,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
}))

vi.mock('#city/hooks', () => ({
  useGetCity: (id?: string) => ({ data: id ? { id, name: 'Core', coordinates: { x: 50, y: 50 } } : undefined }),
  useListCities: () => ({ data: { cities: [ { id: 'c1', name: 'Core', coordinates: { x: 50, y: 50 } } ], count_limit: 3 } }),
}))

vi.mock('#outpost/hooks', () => ({
  useGetOutpost: () => ({ data: undefined }),
  useListOutposts: () => ({ data: { outposts: [], count_limit: 2 } }),
}))

vi.mock('#technology/hooks', () => ({
  useListTechnologies: () => ({ data: { technologies: [ { code: 'espionage', level: data.espionage } ] } }),
}))

vi.mock('#troop/hooks', () => ({
  useListMovements: () => ({
    data: [ {
      id: 'own-1',
      action: 'explore',
      kind: 'outgoing',
      origin: { x: 44, y: 46 },
      destination: { x: 44, y: 54 },
      departure_at: NOW - 1_000,
      arrive_at: NOW + 100_000,
      battle_id: null,
      resources: { plastic: 0, mushroom: 0, plasma: 0, water: 0 },
      troops: [],
    } ],
  }),
  useListIncomingMovements: () => ({ data: data.incoming }),
  useMovementCapacity: () => ({ data: { used: 1, limit: 5 } }),
  useListTroops: () => ({ data: [] }),
  useGetMovement: (id: string | null) => ({ data: id ? { id } : undefined, isPending: false, isError: false }),
}))

vi.mock('#map/hooks', async importOriginal => {
  const original = await importOriginal<typeof import('#map/hooks')>()
  const markers = {
    viewer: { player_id: 'me', faction_code: 'the_confederation', alliance_id: null },
    cities: [
      { id: 'c1', name: 'Core', player_id: 'me', owner_name: 'Moi', faction_code: 'the_confederation', alliance_tag: null, relation: 'mine', size: 2, coordinates: { x: 50, y: 50 } },
      { id: 'e1', name: 'Harrow', player_id: 'sys', owner_name: 'Harrow', faction_code: 'the_ash_liturgy', alliance_tag: 'SYS', relation: 'system', size: 1, coordinates: { x: 52, y: 50 } },
    ],
    outposts: [],
  }
  return {
    ...original,
    useWorldTerrain: () => ({ data: { size: 100, terrain: 'f'.repeat(10_000) } }),
    useWorldExploration: () => ({ data: new Map([ [ '50:50', { plastic: 1, mushroom: 1, solar: 1 } ], [ '52:50', { plastic: 1.5, mushroom: 0.9, solar: 1.1 } ], [ '51:52', { plastic: 1, mushroom: 1, solar: 1 } ] ]) }),
    useWorldMarkers: () => ({ data: markers }),
    useMinimapMarkers: () => ({ data: markers }),
    useWorldTargets: () => ({ data: undefined, isPending: true }),
    useCellIntel: () => ({ data: null }),
  }
})

vi.mock('#movement/send', () => ({
  MovementSendWizard: ({ state, origin }: { state: unknown; origin: unknown }) => (
    <div data-testid="wizard">{JSON.stringify({ origin, state })}</div>
  ),
}))
vi.mock('#movement/details', () => ({
  MovementDetails: ({ movement }: { movement: { id: string } }) => <div data-testid="movement-details">{movement.id}</div>,
}))
vi.mock('#movement/incoming/details', () => ({
  IncomingMovementDetails: ({ movement }: { movement: { id: string } }) => <div data-testid="incoming-details">{movement.id}</div>,
}))

/** 700 × 700 stage, zoom 3 (15 rows): cells of 700 / 15 px, window x 42.5 … 57.5, y 57.5 (top) … 42.5. */
const CELL = 700 / 15
const pointOf = (x: number, y: number) => ({ clientX: (x - 42.5) * CELL, clientY: (57.5 - y) * CELL })

const click = (point: { clientX: number; clientY: number }) => {
  const stage = document.getElementById('map') as HTMLElement
  fireEvent.pointerDown(stage, { ...point, button: 0, pointerId: 1 })
  fireEvent.pointerUp(stage, { ...point, button: 0, pointerId: 1 })
}

beforeAll(() => {
  globalThis.ResizeObserver = class {
    private callback: ResizeObserverCallback
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback
    }
    observe() {
      this.callback([ { contentRect: { width: 700, height: 700 } } as ResizeObserverEntry ], this as unknown as ResizeObserver)
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

beforeEach(() => {
  data.incoming = []
  data.espionage = 1
})

afterEach(cleanup)

const renderMap = (onSearchChange = vi.fn()) => {
  render(<MapPage origin={{ kind: 'city', id: 'c1' }} search={{}} onSearchChange={onSearchChange} />)
  return onSearchChange
}

describe('MapPage (slice 044)', () => {
  it('opens the cell menu on a system city and hands the attack to the send wizard in the drawer', () => {
    renderMap()
    expect(screen.getByText('15×15')).toBeInTheDocument()

    click(pointOf(52, 50))
    const menu = screen.getByRole('menu')
    expect(within(menu).getAllByRole('menuitem').map(item => item.textContent)).toEqual([ 'Attaquer', 'Espionner', 'Détails' ])

    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Attaquer' }))
    expect(screen.queryByRole('menu')).toBeNull()
    const wizard = JSON.parse(screen.getByTestId('wizard').textContent ?? '{}')
    expect(wizard.origin).toEqual({ kind: 'city', id: 'c1' })
    expect(wizard.state).toMatchObject({ step: 'ordre', x: 52, y: 50, action: MovementAction.ATTACK })
    expect(screen.getByRole('complementary', { name: 'Envoyer des troupes' })).toBeInTheDocument()
  })

  it('disables « Espionner » without the Espionnage technology', () => {
    data.espionage = 0
    renderMap()
    click(pointOf(52, 50))
    expect(screen.getByRole('menuitem', { name: /Espionner/ })).toBeDisabled()
  })

  it('shows cell details in the drawer from « Détails », and settles an explored empty cell', () => {
    renderMap()
    click(pointOf(51, 52))
    expect(screen.getAllByRole('menuitem').map(item => item.textContent)).toEqual([ 'Établir un avant-poste', 'Détails' ])
    fireEvent.click(screen.getByRole('menuitem', { name: 'Détails' }))
    const drawer = screen.getByRole('complementary', { name: 'Case (51, 52)' })
    expect(within(drawer).getByText(/Coefficients de la cellule/)).toBeInTheDocument()
    expect(within(drawer).getByRole('button', { name: 'Établir un avant-poste' })).toBeEnabled()

    fireEvent.click(within(drawer).getByRole('button', { name: 'Fermer le panneau' }))
    expect(screen.queryByRole('complementary')).toBeNull()
  })

  it('opens the own movement details when its arrow is clicked', () => {
    renderMap()
    click(pointOf(44, 50))
    expect(screen.getByTestId('movement-details')).toHaveTextContent('own-1')
    expect(screen.getByRole('link', { name: 'Ouvrir dans Mouvements' })).toHaveAttribute('href', '/city/c1/world/movement/own-1')
  })

  it('opens the incoming attack card on its arrow from Détection 2', () => {
    data.incoming = [ {
      id: 'in-1',
      target: { kind: 'city', id: 'c1', name: 'Core', coordinates: { x: 50, y: 50 } },
      arrive_at: NOW + 60_000,
      origin: { x: 56, y: 44 },
      departure_at: NOW - 60_000,
      attacker: { name: 'Raider', faction_code: FactionCode.THE_ASH_LITURGY },
    } ]
    renderMap()
    click(pointOf(53, 47))
    expect(screen.getByTestId('incoming-details')).toHaveTextContent('in-1')
    expect(screen.getByRole('complementary', { name: 'Attaque entrante' })).toBeInTheDocument()
  })

  it('validates « Aller à » and writes the layers to the URL', () => {
    const onSearchChange = renderMap()
    const [ x, y ] = screen.getAllByRole('spinbutton')
    fireEvent.change(x, { target: { value: '0' } })
    fireEvent.change(y, { target: { value: String(WORLD_SIZE) } })
    fireEvent.click(screen.getByRole('button', { name: 'Aller' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Coordonnées entre 1 et 100')

    fireEvent.click(screen.getByRole('checkbox', { name: 'Cibles et menaces' }))
    expect(onSearchChange).toHaveBeenCalledWith({ layers: 'movements,targets' })
  })

  it('writes the centre and zoom to the URL once the view settles', async () => {
    vi.useFakeTimers()
    try {
      const onSearchChange = renderMap()
      fireEvent.click(screen.getByRole('button', { name: 'Zoom arrière' }))
      expect(screen.getByText('21×21')).toBeInTheDocument()
      await act(async () => {
        vi.advanceTimersByTime(400)
      })
      expect(onSearchChange).toHaveBeenCalledWith({ x: 50, y: 50, zoom: 4 })
    } finally {
      vi.useRealTimers()
    }
  })
})

import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CombatStrategy, OutpostType } from '@eoneom/api-client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { City, Outpost } from '#types'
import { AuthProvider } from '#auth/context'
import { LocationProvider, useLocation } from '#location/context'
import { cityKeys } from '#city/hooks'
import { outpostKeys } from '#outpost/hooks'
import { ResourcePanelProvider } from '#ui/header/resources/context'

import { Header } from './index'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    children,
    ...props
  }: {
    to: string
    params?: Record<string, string>
    children: React.ReactNode
  }) => (
    <a
      href={Object.entries(params ?? {}).reduce(
        (href, [key, value]) => href.replace(`$${key}`, value),
        to
      )}
      {...props}
    >
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: '/' }),
}))

const minimalCity = (overrides: Partial<City> = {}): City => ({
  id: 'city-1',
  name: 'Testville',
  default_combat_strategy: CombatStrategy.BALANCED,
  plastic: 10,
  mushroom: 20,
  plasma: 0,
  water: 0,
  maximum_building_levels: 5,
  building_levels_used: 1,
  coordinates: { x: 2, y: 3 },
  earnings_per_second: { plastic: 0.1, mushroom: 0.2 , plasma: 0, water: 0 },
  pre_cell_earnings_per_second: { plastic: 0.1, mushroom: 0.2 , plasma: 0, water: 0 },
  cell_resource_coefficient: { plastic: 1, mushroom: 1 },
  technology_production_multiplier: { plastic: 1, mushroom: 1, plasma: 1, water: 1 },
  faction_production_multiplier: { plastic: 1, mushroom: 1 },
  warehouses_capacity: { plastic: 1000, mushroom: 1000 },
  warehouse_space_remaining: { plastic: 900, mushroom: 800 },
  warehouse_full_in_seconds: { plastic: 0, mushroom: 0 },
  energy: 0,
  pre_cell_energy: 0,
  neutral_photovoltaic_energy: 0,
  cell_solar_coefficient: 1,
  photovoltaic_optimization_level: 0,
  energy_consumption: 0,
  production_energy_ratio: 1,
  ...overrides })

const minimalOutpost = (overrides: Partial<Outpost> = {}): Outpost => ({
  id: 'out-1',
  coordinates: { x: 6, y: 7 },
  type: OutpostType.TEMPORARY,
  default_combat_strategy: CombatStrategy.BALANCED,
  plastic: 0,
  mushroom: 0,
  plasma: 0,
  earnings_per_second: { plastic: 0, mushroom: 0 , plasma: 0},
  pre_cell_earnings_per_second: { plastic: 0, mushroom: 0 , plasma: 0},
  cell_resource_coefficient: { plastic: 1, mushroom: 1 },
  technology_production_multiplier: { plastic: 1, mushroom: 1, plasma: 1 },
  faction_production_multiplier: { plastic: 1, mushroom: 1 },
  warehouses_capacity: { plastic: 2000, mushroom: 1500 },
  warehouse_full_in_seconds: { plastic: 0, mushroom: 0 },
  ...overrides })

interface Props {
  cityId?: string
  outpostId?: string
}

const SetLocation: React.FC<Props> = ({ cityId, outpostId }) => {
  const { setCity, setOutpost } = useLocation()
  React.useLayoutEffect(() => {
    if (cityId) setCity(cityId)
    else if (outpostId) setOutpost(outpostId)
  }, [cityId, outpostId, setCity, setOutpost])
  return null
}

interface RenderOptions {
  city?: City
  outpost?: Outpost
  cityId?: string
  outpostId?: string
}

function renderHeader({ city, outpost, cityId, outpostId }: RenderOptions = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } } })

  if (city && cityId) {
    queryClient.setQueryData(cityKeys.detail(cityId), city)
  }
  if (outpost && outpostId) {
    queryClient.setQueryData(outpostKeys.detail(outpostId), outpost)
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LocationProvider>
          {cityId && <SetLocation cityId={cityId} />}
          {outpostId && <SetLocation outpostId={outpostId} />}
          <ResourcePanelProvider>
            <Header />
          </ResourcePanelProvider>
        </LocationProvider>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

describe('Header', () => {
  // jsdom here has no localStorage; AuthProvider reads the token from it.
  beforeEach(() => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders brand heading', () => {
    renderHeader()
    expect(screen.getByRole('heading', { level: 3, name: 'EONEOM' })).toBeInTheDocument()
  })

  it('shows city name and city link when city is set', async () => {
    const city = minimalCity({ id: 'c-99', name: 'Metro' })
    renderHeader({ city, cityId: 'c-99' })
    await act(async () => {})
    const link = screen.getByRole('link', { name: 'Metro' })
    expect(link).toHaveAttribute('href', '/city/c-99/base/')
  })

  it('shows formatted coordinates and outpost link when only outpost is set', async () => {
    const outpost = minimalOutpost({ id: 'o-42', coordinates: { x: 1, y: 9 } })
    renderHeader({ outpost, outpostId: 'o-42' })
    await act(async () => {})
    const link = screen.getByRole('link', { name: '1.9' })
    expect(link).toHaveAttribute('href', '/outpost/o-42')
  })

  it('prefers city over outpost for title and link', async () => {
    const city = minimalCity({ id: 'c-1', name: 'OnlyCity' })
    renderHeader({ city, cityId: 'c-1' })
    await act(async () => {})
    expect(screen.getByRole('link', { name: 'OnlyCity' })).toHaveAttribute('href', '/city/c-1/base/')
  })

  it('when neither city nor outpost, no title link is rendered', async () => {
    renderHeader()
    await act(async () => {})
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('shows the city coordinates next to the title', async () => {
    const city = minimalCity({ id: 'c-5', name: 'Metro', coordinates: { x: 12, y: 7 } })
    renderHeader({ city, cityId: 'c-5' })
    await act(async () => {})
    expect(screen.getByText('12.7')).toBeInTheDocument()
  })

  it('with city, shows the compact resource button and no progress bar in the bar', async () => {
    const city = minimalCity()
    renderHeader({ city, cityId: city.id })
    await act(async () => {})
    expect(screen.getByRole('button', { name: 'Ressources — afficher le détail' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('with outpost, shows three resource chips and no progress bar in the bar', async () => {
    const outpost = minimalOutpost({ plastic: 100, mushroom: 200 })
    const { container } = renderHeader({ outpost, outpostId: outpost.id })
    await act(async () => {})
    expect(container.querySelectorAll('.header-resource-chip')).toHaveLength(3)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })
})

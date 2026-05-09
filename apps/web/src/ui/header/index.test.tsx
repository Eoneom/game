import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OutpostType } from '@server-core/outpost/constant/type'
import { vi } from 'vitest'

import type { City, Outpost } from '#types'
import { AuthProvider } from '#auth/context'
import { LocationProvider, useLocation } from '#location/context'
import { cityKeys } from '#city/hooks'
import { outpostKeys } from '#outpost/hooks'

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
}))

const minimalCity = (overrides: Partial<City> = {}): City => ({
  id: 'city-1',
  name: 'Testville',
  plastic: 10,
  mushroom: 20,
  maximum_building_levels: 5,
  building_levels_used: 1,
  coordinates: { sector: 1, x: 2, y: 3 },
  earnings_per_second: { plastic: 0.1, mushroom: 0.2 },
  pre_cell_earnings_per_second: { plastic: 0.1, mushroom: 0.2 },
  cell_resource_coefficient: { plastic: 1, mushroom: 1 },
  warehouses_capacity: { plastic: 1000, mushroom: 1000 },
  warehouse_space_remaining: { plastic: 900, mushroom: 800 },
  warehouse_full_in_seconds: { plastic: 0, mushroom: 0 },
  ...overrides,
})

const minimalOutpost = (overrides: Partial<Outpost> = {}): Outpost => ({
  id: 'out-1',
  coordinates: { sector: 5, x: 6, y: 7 },
  type: OutpostType.TEMPORARY,
  plastic: 0,
  mushroom: 0,
  earnings_per_second: { plastic: 0, mushroom: 0 },
  pre_cell_earnings_per_second: { plastic: 0, mushroom: 0 },
  cell_resource_coefficient: { plastic: 1, mushroom: 1 },
  ...overrides,
})

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
    defaultOptions: { queries: { retry: false } },
  })

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
          <Header />
        </LocationProvider>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

describe('Header', () => {
  it('renders brand heading', () => {
    renderHeader()
    expect(screen.getByRole('heading', { level: 3, name: 'Eoneom' })).toBeInTheDocument()
  })

  it('shows city name and city link when city is set', async () => {
    const city = minimalCity({ id: 'c-99', name: 'Metro' })
    renderHeader({ city, cityId: 'c-99' })
    await act(async () => {})
    const link = screen.getByRole('link', { name: 'Metro' })
    expect(link).toHaveAttribute('href', '/city/c-99')
  })

  it('shows formatted coordinates and outpost link when only outpost is set', async () => {
    const outpost = minimalOutpost({ id: 'o-42', coordinates: { sector: 3, x: 1, y: 9 } })
    renderHeader({ outpost, outpostId: 'o-42' })
    await act(async () => {})
    const link = screen.getByRole('link', { name: '3.1.9' })
    expect(link).toHaveAttribute('href', '/outpost/o-42')
  })

  it('prefers city over outpost for title and link', async () => {
    const city = minimalCity({ id: 'c-1', name: 'OnlyCity' })
    renderHeader({ city, cityId: 'c-1' })
    await act(async () => {})
    expect(screen.getByRole('link', { name: 'OnlyCity' })).toHaveAttribute('href', '/city/c-1')
  })

  it('when neither city nor outpost, no title link is rendered', async () => {
    renderHeader()
    await act(async () => {})
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('with city, shows resource progress bars', async () => {
    const city = minimalCity()
    renderHeader({ city, cityId: city.id })
    await act(async () => {})
    expect(screen.getAllByRole('progressbar')).toHaveLength(2)
  })

  it('with outpost, shows two resource items without progress bars', async () => {
    const outpost = minimalOutpost({ plastic: 100, mushroom: 200 })
    renderHeader({ outpost, outpostId: outpost.id })
    await act(async () => {})
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.queryAllByRole('progressbar')).toHaveLength(0)
  })
})

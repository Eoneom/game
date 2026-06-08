import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OutpostType } from '@eoneom/api-client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'

import { AuthProvider } from '#auth/context'
import { LocationProvider } from '#location/context'
import { outpostKeys } from '#outpost/hooks'
import type { Outpost } from '#types'

import { OutpostPage } from './page'

const mockSettleCity = vi.fn()
const mockSetPermanent = vi.fn()

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

vi.mock('#outpost/hooks', async () => ({
  ...(await vi.importActual<typeof import('#outpost/hooks')>('#outpost/hooks')),
  useSetOutpostPermanent: () => ({ mutate: mockSetPermanent }),
}))

vi.mock('#city/hooks', async () => ({
  ...(await vi.importActual<typeof import('#city/hooks')>('#city/hooks')),
  useSettleCity: () => ({ mutate: mockSettleCity }),
}))

vi.mock('#outpost/settle', () => ({
  OutpostSettle: ({ onSettle }: { onSettle: (name: string) => void }) => (
    <button onClick={() => onSettle('CityName')}>Settle</button>
  )
}))

let queryClient: QueryClient

const minimalOutpost = (overrides: Partial<Outpost> = {}): Outpost => ({
  id: 'o1',
  coordinates: { sector: 1, x: 1, y: 1 },
  type: OutpostType.TEMPORARY,
  plastic: 10,
  mushroom: 20,
  plasma: 0,
  earnings_per_second: { plastic: 0, mushroom: 0 , plasma: 0},
  pre_cell_earnings_per_second: { plastic: 0, mushroom: 0 , plasma: 0},
  cell_resource_coefficient: { plastic: 1, mushroom: 1 },
  warehouses_capacity: { plastic: 2000, mushroom: 1500 },
  warehouse_full_in_seconds: { plastic: 0, mushroom: 0 },
  ...overrides,
})

function renderWithOutpost(outpost: Outpost | null) {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  if (outpost) {
    queryClient.setQueryData(outpostKeys.detail(outpost.id), outpost)
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LocationProvider>
          <OutpostPage outpostId="o1" />
        </LocationProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe('OutpostPage', () => {
  beforeEach(() => {
    mockSettleCity.mockReset()
    mockSetPermanent.mockReset()
  })

  it('shows make permanent button only for temporary outpost', async () => {
    const outpost = minimalOutpost()

    renderWithOutpost(outpost)
    expect(screen.getByRole('button', { name: 'Rendre permanent' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Settle' })).toBeInTheDocument()

    act(() => {
      queryClient.setQueryData(outpostKeys.detail(outpost.id), {
        ...outpost,
        type: OutpostType.PERMANENT,
        earnings_per_second: { plastic: 0.12, mushroom: 0.1 , plasma: 0},
        pre_cell_earnings_per_second: { plastic: 0.12, mushroom: 0.1 , plasma: 0},
      })
    })

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Rendre permanent' })).not.toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: 'Settle' })).not.toBeInTheDocument()
  })

  it('shows production panel for permanent outpost', () => {
    renderWithOutpost(minimalOutpost({
      type: OutpostType.PERMANENT,
      earnings_per_second: { plastic: 0.12, mushroom: 0.1 , plasma: 0},
      pre_cell_earnings_per_second: { plastic: 0.12, mushroom: 0.1 , plasma: 0},
      cell_resource_coefficient: { plastic: 1.2, mushroom: 0.8 },
    }))

    expect(screen.getByRole('heading', { name: 'Production et terrain' })).toBeInTheDocument()
    expect(screen.getByText('Actuelle')).toBeInTheDocument()
    expect(screen.getByText('Terrain')).toBeInTheDocument()
    expect(screen.getByText('Plasma')).toBeInTheDocument()
  })

  it('hides production panel for temporary outpost', () => {
    renderWithOutpost(minimalOutpost())
    expect(screen.queryByRole('heading', { name: 'Production et terrain' })).not.toBeInTheDocument()
  })

  it('dispatches setOutpostPermanent on button click', async () => {
    renderWithOutpost(minimalOutpost())

    await userEvent.click(screen.getByRole('button', { name: 'Rendre permanent' }))
    expect(mockSetPermanent).toHaveBeenCalledTimes(1)
  })
})

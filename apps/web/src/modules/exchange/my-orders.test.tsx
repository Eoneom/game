import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ExchangeOrderStatus,
  ExchangeResource,
  ExchangeSide,
  TroopCode,
  type ExchangeOrder,
} from '@eoneom/api-client'

import { ExchangeMyOrders } from '#exchange/my-orders'
import { exchangeKeys } from '#exchange/hooks'

/** Slice 046: « Mes ordres » progress, relative expiry, folded history and cancel. */

const api = vi.hoisted(() => ({ cancelOrder: vi.fn(), mine: vi.fn() }))

vi.mock('#helpers/api', () => ({ client: { exchange: { cancelOrder: api.cancelOrder, mine: api.mine } } }))
vi.mock('#auth/context', () => ({ useAuth: () => ({ token: 'token' }) }))
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const NOW = new Date('2026-11-27T10:00:00').getTime()
const HOUR = 60 * 60 * 1000

const order = (overrides: Partial<ExchangeOrder>): ExchangeOrder => ({
  id: 'o1',
  city_id: 'c1',
  city_name: 'Alpha',
  side: ExchangeSide.SELL,
  resource: ExchangeResource.PLASTIC,
  lots: 10,
  filled_lots: 3,
  price: 12,
  status: ExchangeOrderStatus.OPEN,
  created_at: NOW - HOUR,
  closed_at: null,
  expires_at: NOW + (6 * 24 + 4) * HOUR + 60_000,
  reserved_resources: { plastic: 700, mushroom: 0, plasma: 0, water: 0 },
  reserved_carriers: [ { code: TroopCode.LIGHT_TRANSPORTER, count: 1 } ],
  ...overrides,
})

let queryClient: QueryClient

const renderOrders = () => render(
  <QueryClientProvider client={queryClient}>
    <ExchangeMyOrders resource={ExchangeResource.PLASTIC} />
  </QueryClientProvider>
)

describe('ExchangeMyOrders (slice 046)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: [ 'Date' ] })
    vi.setSystemTime(NOW)
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
    api.cancelOrder.mockResolvedValue({ status: 'ok' })
    api.mine.mockImplementation(() => new Promise(() => undefined))
    queryClient.setQueryData(exchangeKeys.mine, {
      open: [
        order({ id: 'old', created_at: NOW - 2 * HOUR, resource: ExchangeResource.MUSHROOM, side: ExchangeSide.BUY, filled_lots: 0, lots: 4 }),
        order({ id: 'new' }),
      ],
      closed: [
        order({ id: 'closed', status: ExchangeOrderStatus.FILLED, filled_lots: 10, closed_at: NOW - HOUR, city_name: '' }),
      ],
      trading_posts: [],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('lists open orders newest first with their progress, price and time left', () => {
    renderOrders()

    const table = screen.getAllByRole('table')[0]
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Vente · Plastique')
    expect(rows[0]).toHaveTextContent('3 / 10 lots')
    expect(within(rows[0]).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3')
    expect(rows[0]).toHaveTextContent('12 eau pure / lot')
    expect(rows[0]).toHaveTextContent('700 plastique')
    expect(within(rows[0]).getByText('6 j 4 h')).toHaveAttribute('title', expect.stringMatching(/^\d{2}\/\d{2}\/2026 \d{2}:\d{2}$/))
    // The selected pair is highlighted, other pairs stay listed.
    expect(rows[0]).toHaveAttribute('aria-current', 'true')
    expect(rows[1]).toHaveTextContent('Achat · Champignon')
    expect(rows[1]).not.toHaveAttribute('aria-current')
  })

  it('folds the history until asked', async () => {
    vi.useRealTimers()
    const user = userEvent.setup()
    renderOrders()

    const toggle = screen.getByRole('button', { name: /Historique \(50 derniers\)/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getAllByRole('table')).toHaveLength(1)

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const history = screen.getAllByRole('table')[1]
    expect(within(history).getAllByRole('row')[1]).toHaveTextContent('Exécuté')
    expect(within(history).getAllByRole('row')[1]).toHaveTextContent('—')
  })

  it('cancels without confirmation', async () => {
    vi.useRealTimers()
    const user = userEvent.setup()
    renderOrders()

    await user.click(screen.getAllByRole('button', { name: 'Annuler' })[0])
    await waitFor(() => expect(api.cancelOrder).toHaveBeenCalledWith('token', { order_id: 'new' }))
  })

  it('says when nothing is open', () => {
    queryClient.setQueryData(exchangeKeys.mine, { open: [], closed: [], trading_posts: [] })
    renderOrders()
    expect(screen.getByText('Aucun ordre ouvert.')).toBeInTheDocument()
  })
})

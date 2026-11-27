import React, { useState } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ExchangeResource,
  ExchangeSide,
  TroopCode,
  type ExchangeBookDataResponse,
  type ExchangeEstimateOrderDataResponse,
  type ExchangeMineDataResponse,
  type ExchangeOrderInput,
  type ExchangeSummaryDataResponse,
} from '@eoneom/api-client'

import { ExchangePage, type ExchangePageSearch } from '#exchange/page'

/** Slice 046: quick trade, URL state and the « Marché » section of the Bourse page. */

const api = vi.hoisted(() => ({
  mine: vi.fn(),
  summary: vi.fn(),
  estimateOrder: vi.fn(),
  placeOrder: vi.fn(),
  cancelOrder: vi.fn(),
  book: vi.fn(),
  trades: vi.fn(),
  getCity: vi.fn(),
  listCities: vi.fn(),
}))

vi.mock('#helpers/api', () => ({
  client: {
    exchange: {
      mine: api.mine,
      summary: api.summary,
      estimateOrder: api.estimateOrder,
      placeOrder: api.placeOrder,
      cancelOrder: api.cancelOrder,
      book: api.book,
      trades: api.trades,
    },
    city: { get: api.getCity, list: api.listCities },
  },
}))
vi.mock('#auth/context', () => ({ useAuth: () => ({ token: 'token' }) }))
vi.mock('#location/context', () => ({ useLocation: () => ({ cityId: 'c1', outpostId: null }) }))
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, search, className }: {
    children: React.ReactNode
    to: string
    params?: Record<string, string>
    search?: Record<string, string>
    className?: string
  }) => {
    const path = Object.entries(params ?? {}).reduce((result, [ key, value ]) => result.replace(`$${key}`, value), to)
    return <a className={className} href={search ? `${path}?${new URLSearchParams(search).toString()}` : path}>{children}</a>
  },
}))

const ok = <T,>(data: T) => Promise.resolve({ status: 'ok' as const, data })

const tradingPost = (city_id: string, city_name: string, open_order_count = 1, level = 3) => ({ city_id, city_name, level, open_order_count })

const mine = (overrides: Partial<ExchangeMineDataResponse> = {}): ExchangeMineDataResponse => ({
  open: [],
  closed: [],
  trading_posts: [ tradingPost('c1', 'Alpha') ],
  ...overrides,
})

const summary: ExchangeSummaryDataResponse = {
  pairs: [
    {
      resource: ExchangeResource.PLASTIC,
      best_bid: { price: 12, lots: 40, own_lots: 0 },
      best_ask: { price: 14, lots: 8, own_lots: 0 },
      last_trade: null,
    },
    { resource: ExchangeResource.MUSHROOM, best_bid: null, best_ask: { price: 11, lots: 2, own_lots: 0 }, last_trade: null },
    { resource: ExchangeResource.PLASMA, best_bid: null, best_ask: null, last_trade: null },
  ],
}

const estimateFor = (input: ExchangeOrderInput): ExchangeEstimateOrderDataResponse => ({
  reserved_resources: input.side === ExchangeSide.SELL
    ? { plastic: input.lots * 100, mushroom: 0, plasma: 0, water: 0 }
    : { plastic: 0, mushroom: 0, plasma: 0, water: input.lots * input.price },
  enough_resources: true,
  reserved_carriers: [ { code: TroopCode.LIGHT_TRANSPORTER, count: 1 } ],
  typical_delivery_duration: 25 * 60_000,
  open_order_count: 1,
  open_order_limit: 3,
  carrier_load: input.lots * 100,
  available_carrier_capacity: 22_000,
  immediate_fill: { lots: 0, water: 0 },
})

const book: ExchangeBookDataResponse = {
  resource: ExchangeResource.PLASTIC,
  bids: [ { price: 12, lots: 40, own_lots: 0 }, { price: 11, lots: 6, own_lots: 4 } ],
  asks: [ { price: 14, lots: 8, own_lots: 0 } ],
}

const city = (id: string) => ({ id, name: id, plastic: 2400, mushroom: 0, plasma: 0, water: 500 })

let queryClient: QueryClient
const navigate = vi.fn()

const Harness: React.FC<{ initial: ExchangePageSearch }> = ({ initial }) => {
  const [ search, setSearch ] = useState(initial)
  return (
    <ExchangePage
      search={search}
      onNavigate={next => {
        navigate(next)
        setSearch(next)
      }}
    />
  )
}

const renderPage = (initial: ExchangePageSearch = {}) => render(
  <QueryClientProvider client={queryClient}>
    <Harness initial={initial} />
  </QueryClientProvider>
)

const priceInput = () => screen.getByLabelText('Prix')
const quantityInput = () => screen.getByLabelText('Quantité')
const placeButton = () => screen.getByRole('button', { name: 'Placer l\'ordre' })

describe('ExchangePage (slice 046)', () => {
  let store: Map<string, string>

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    navigate.mockReset()
    store = new Map()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    })
    api.mine.mockImplementation(() => ok(mine()))
    api.summary.mockImplementation(() => ok(summary))
    api.estimateOrder.mockImplementation((_token: string, input: ExchangeOrderInput) => ok(estimateFor(input)))
    api.placeOrder.mockImplementation(() => ok({ order_id: 'o1', status: 'open', filled_lots: 0 }))
    api.book.mockImplementation(() => ok(book))
    api.trades.mockImplementation(() => ok({ resource: ExchangeResource.PLASTIC, trades: [] }))
    api.getCity.mockImplementation((_token: string, { city_id }: { city_id: string }) => ok(city(city_id)))
    api.listCities.mockImplementation(() => ok({ cities: [ { id: 'c1', name: 'Alpha' } ], count_limit: 3 }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  describe('quick trade', () => {
    it('defaults to selling plastic and shows the best bid | ask of every pair', async () => {
      renderPage()

      expect(await screen.findByRole('radio', { name: /Plastique/ })).toHaveAttribute('aria-checked', 'true')
      expect(screen.getByRole('radio', { name: 'Vendre' })).toHaveAttribute('aria-checked', 'true')
      await waitFor(() => expect(screen.getByRole('radio', { name: /Plastique/ })).toHaveTextContent('12 | 14'))
      expect(screen.getByRole('radio', { name: /Champignon/ })).toHaveTextContent('— | 11')
      expect(screen.getByRole('radio', { name: /Plasma/ })).toHaveTextContent('— | —')
      expect(screen.getByText('Meilleur achat 12 (40 lots) · Meilleure vente 14 (8 lots)')).toBeInTheDocument()
      expect(screen.getByTestId('quick-trade-equivalent')).toHaveTextContent('= 100 plastique')
    })

    it('« Prix du marché » takes the best bid when selling and the best ask when buying', async () => {
      const user = userEvent.setup()
      renderPage()
      const marketButton = await screen.findByRole('button', { name: 'Prix du marché' })
      await waitFor(() => expect(marketButton).toBeEnabled())

      await user.click(marketButton)
      expect(priceInput()).toHaveValue(12)

      await user.click(screen.getByRole('radio', { name: 'Acheter' }))
      await user.click(screen.getByRole('button', { name: 'Prix du marché' }))
      expect(priceInput()).toHaveValue(14)
    })

    it('disables « Prix du marché » when no order waits on the other side', async () => {
      renderPage({ resource: ExchangeResource.MUSHROOM, side: ExchangeSide.SELL })

      await screen.findByText('Meilleur achat — · Meilleure vente 11 (2 lots)')
      expect(screen.getByRole('button', { name: 'Prix du marché' })).toBeDisabled()
      expect(screen.getByText('Aucun ordre en face : votre ordre attendra dans le carnet.')).toBeInTheDocument()
    })

    it('keeps the resource and the side in the URL', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.click(await screen.findByRole('radio', { name: /Champignon/ }))
      expect(navigate).toHaveBeenLastCalledWith({ resource: ExchangeResource.MUSHROOM, side: ExchangeSide.SELL })
      await user.click(screen.getByRole('radio', { name: 'Acheter' }))
      expect(navigate).toHaveBeenLastCalledWith({ resource: ExchangeResource.MUSHROOM, side: ExchangeSide.BUY })
      expect(screen.getByRole('radio', { name: /Champignon/ })).toHaveAttribute('aria-checked', 'true')
    })

    it('hides the city selector with one trading-post city and lists them with several', async () => {
      const { unmount } = renderPage()
      expect(await screen.findByText('Depuis Alpha')).toBeInTheDocument()
      expect(screen.queryByLabelText('Ville')).not.toBeInTheDocument()
      unmount()

      queryClient.clear()
      api.mine.mockImplementation(() => ok(mine({ trading_posts: [ tradingPost('c2', 'Beta', 0, 2), tradingPost('c1', 'Alpha', 1, 3) ] })))
      renderPage()
      const select = await screen.findByLabelText('Ville')
      // The current city is selected by default when it can trade.
      expect(select).toHaveValue('c1')
      expect(within(select).getAllByRole('option').map(option => option.textContent)).toEqual([
        'Beta — 0 / 2 ordres',
        'Alpha — 1 / 3 ordres',
      ])
    })

    it('replaces the form with the trading post call to action without trading-post city', async () => {
      api.mine.mockImplementation(() => ok(mine({ trading_posts: [] })))
      renderPage()

      expect(await screen.findByText('Construisez un Comptoir d\'échange pour accéder à la bourse de faction.')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Voir les bâtiments' })).toHaveAttribute('href', '/city/c1/base/building?code=trading_post')
      expect(screen.queryByRole('button', { name: 'Placer l\'ordre' })).not.toBeInTheDocument()
    })

    it('keeps « Placer l\'ordre » disabled while the order is invalid, then shows the live summary', async () => {
      const user = userEvent.setup()
      renderPage()
      await screen.findByText('Depuis Alpha')

      expect(screen.getByTestId('quick-trade-issue'))
        .toHaveTextContent('Le prix doit être un nombre entier d\'eau pure par lot (au moins 1).')
      expect(placeButton()).toBeDisabled()

      await user.type(priceInput(), '12')
      await user.clear(quantityInput())
      await user.type(quantityInput(), '3')

      await waitFor(() => expect(placeButton()).toBeEnabled())
      expect(screen.getByTestId('quick-trade-issue')).toHaveTextContent('')
      expect(screen.getByText(/Vous recevrez au moins/)).toHaveTextContent('Vous recevrez au moins 36 eau pure')
      expect(screen.getByText('300 plastique réservés')).toBeInTheDocument()
      expect(screen.getByText('1 Transporteur léger')).toBeInTheDocument()
      expect(screen.getByText('≈ 25 min vers une ville typique de la faction')).toBeInTheDocument()
      expect(screen.getByText('Votre ordre attendra dans le carnet')).toBeInTheDocument()
      expect(screen.getByText('Ordres ouverts dans cette ville : 1 / 3')).toBeInTheDocument()
      expect(api.estimateOrder).toHaveBeenLastCalledWith('token', {
        city_id: 'c1', side: ExchangeSide.SELL, resource: ExchangeResource.PLASTIC, lots: 3, price: 12,
      })
    })

    it('shows the first server-side problem from the estimate', async () => {
      const user = userEvent.setup()
      api.estimateOrder.mockImplementation((_token: string, input: ExchangeOrderInput) => ok({
        ...estimateFor(input),
        reserved_carriers: null,
        carrier_load: 300,
        available_carrier_capacity: 120,
      }))
      renderPage()
      await screen.findByText('Depuis Alpha')
      await user.type(priceInput(), '12')
      await user.clear(quantityInput())
      await user.type(quantityInput(), '3')

      await waitFor(() => expect(screen.getByTestId('quick-trade-issue')).toHaveTextContent(
        'Transporteurs insuffisants : capacité 120 disponible, 300 nécessaire. Recrutez des transporteurs ou libérez-en.'
      ))
      expect(placeButton()).toBeDisabled()
    })

    it('fills « Max » from the stock and the free carriers once the estimate answered', async () => {
      const user = userEvent.setup()
      renderPage()
      await screen.findByText('Depuis Alpha')
      expect(screen.getByRole('button', { name: 'Max' })).toBeDisabled()

      await user.type(priceInput(), '12')
      // 2 400 plastic = 24 lots; 22 000 capacity = 220 lots.
      await waitFor(() => expect(screen.getByRole('button', { name: 'Max' })).toBeEnabled())
      await user.click(screen.getByRole('button', { name: 'Max' }))
      expect(quantityInput()).toHaveValue(24)
    })

    it('places the order, disables the button while pending and resets the quantity after success', async () => {
      const user = userEvent.setup()
      let resolvePlace: (value: unknown) => void = () => undefined
      api.placeOrder.mockImplementation(() => new Promise(resolve => {
        resolvePlace = resolve
      }))
      renderPage()
      await screen.findByText('Depuis Alpha')
      await user.type(priceInput(), '12')
      await user.clear(quantityInput())
      await user.type(quantityInput(), '3')
      await waitFor(() => expect(placeButton()).toBeEnabled())

      await user.click(placeButton())
      expect(api.placeOrder).toHaveBeenCalledWith('token', {
        city_id: 'c1', side: ExchangeSide.SELL, resource: ExchangeResource.PLASTIC, lots: 3, price: 12,
      })
      expect(await screen.findByRole('button', { name: 'Envoi…' })).toBeDisabled()

      resolvePlace({ status: 'ok', data: { order_id: 'o1', status: 'open', filled_lots: 0 } })
      await waitFor(() => expect(quantityInput()).toHaveValue(1))
      expect(priceInput()).toHaveValue(12)
      expect(screen.getByRole('radio', { name: 'Vendre' })).toHaveAttribute('aria-checked', 'true')
    })
  })

  describe('market', () => {
    it('is collapsed by default and remembers its open state', async () => {
      const user = userEvent.setup()
      const { unmount } = renderPage()
      const toggle = await screen.findByRole('button', { name: /Marché — Plastique \/ eau pure/ })
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByRole('region', { name: 'Profondeur' })).not.toBeInTheDocument()
      expect(api.book).not.toHaveBeenCalled()

      await user.click(toggle)
      expect(await screen.findByRole('region', { name: 'Profondeur' })).toBeInTheDocument()
      expect(store.get('eoneom:exchange:market-open')).toBe('true')
      unmount()

      renderPage()
      expect(await screen.findByRole('button', { name: /Marché — Plastique/ })).toHaveAttribute('aria-expanded', 'true')
    })

    it('stays closed and still toggles when localStorage throws', async () => {
      const user = userEvent.setup()
      vi.stubGlobal('localStorage', {
        getItem: () => {
          throw new Error('blocked')
        },
        setItem: () => {
          throw new Error('blocked')
        },
      })
      renderPage()
      const toggle = await screen.findByRole('button', { name: /Marché — Plastique/ })
      expect(toggle).toHaveAttribute('aria-expanded', 'false')

      await user.click(toggle)
      expect(toggle).toHaveAttribute('aria-expanded', 'true')
    })

    it('marks own lots and fills the quick trade from a clicked level', async () => {
      const user = userEvent.setup()
      store.set('eoneom:exchange:market-open', 'true')
      renderPage()

      const depth = await screen.findByRole('region', { name: 'Profondeur' })
      expect(await within(depth).findByText('dont 4 à vous')).toBeInTheDocument()

      // An ask is bought at its price.
      await user.click(within(depth).getByRole('button', { name: 'Acheter à 14 eau pure / lot — 8 lots' }))
      expect(navigate).toHaveBeenLastCalledWith({ resource: ExchangeResource.PLASTIC, side: ExchangeSide.BUY })
      expect(screen.getByRole('radio', { name: 'Acheter' })).toHaveAttribute('aria-checked', 'true')
      expect(priceInput()).toHaveValue(14)

      // A bid is sold into at its price; the quantity is untouched.
      await user.clear(quantityInput())
      await user.type(quantityInput(), '5')
      await user.click(within(depth).getByRole('button', { name: 'Vendre à 11 eau pure / lot — 6 lots, dont 4 à vous' }))
      expect(navigate).toHaveBeenLastCalledWith({ resource: ExchangeResource.PLASTIC, side: ExchangeSide.SELL })
      expect(priceInput()).toHaveValue(11)
      expect(quantityInput()).toHaveValue(5)
    })
  })
})

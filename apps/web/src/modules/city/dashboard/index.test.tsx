import React from 'react'
import { act, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider, QueryKey } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  BuildingCode,
  CombatStrategy,
  DefenseCode,
  ExchangeOrderStatus,
  ExchangeResource,
  ExchangeSide,
  RESEARCH_QUEUE_LIMIT,
  TechnologyCode,
  TroopCode,
  type ExchangeOrder,
} from '@eoneom/api-client'

import { buildingKeys } from '#building/hooks'
import { cityKeys } from '#city/hooks'
import { defenseKeys } from '#defense/hooks'
import { exchangeKeys } from '#exchange/hooks'
import { activityKeys } from '#location/activity-hooks'
import { technologyKeys } from '#technology/hooks'
import { troopKeys } from '#troop/hooks'
import type { City } from '#types'

import { CityDashboard } from './index'
import { BuildingQueueCard } from './building-card'
import { DefenseCapacityCard } from './defense-card'
import { EnergyCard } from './energy-card'
import { ExchangeOrdersCard } from './exchange-card'
import { FortificationQueueCard } from './fortification-card'
import { RecruitmentQueueCard } from './recruitment-card'
import { ResearchQueueCard } from './research-card'

/** Slice 042: city dashboard cards, their composition and the countdown refetch fallback. */

vi.mock('#auth/context', () => ({ useAuth: () => ({ token: null }) }))
vi.mock('#ui/header/resources/context', () => ({ useResourcePanel: () => ({ open: vi.fn() }) }))
vi.mock('#location/context', () => ({
  useLocation: () => ({ cityId: 'c1', outpostId: null, setCity: vi.fn(), setOutpost: vi.fn(), clearLocation: vi.fn() }),
}))
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
const MINUTE = 60_000
const requirement = { buildings: [], technologies: [] }

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

const building = (code: BuildingCode, level: number, upgrade?: { at: number, started: number }) => ({
  id: code,
  code,
  level,
  upgrade_cost: { plastic: 0, mushroom: 0, plasma: 0, duration: 0 },
  requirement,
  ...(upgrade ? { upgrade_at: upgrade.at, upgrade_started_at: upgrade.started } : {}),
})

const buildingsData = ({ running = true, queue = 0, tradingPost = 1 }: { running?: boolean, queue?: number, tradingPost?: number } = {}) => ({
  buildings: [
    building(BuildingCode.RECYCLING_PLANT, 4, running ? { at: NOW + 4 * MINUTE, started: NOW - 6 * MINUTE } : undefined),
    building(BuildingCode.MUSHROOM_FARM, 3),
    building(BuildingCode.TRADING_POST, tradingPost),
  ],
  upgrade_queue: [
    { id: 'q1', building_code: BuildingCode.MUSHROOM_FARM, duration_seconds: 600, start_at: NOW + 4 * MINUTE, finish_at: new Date('2026-11-27T14:32:00').getTime() },
    { id: 'q2', building_code: BuildingCode.RECYCLING_PLANT, duration_seconds: 600, start_at: NOW, finish_at: new Date('2026-11-27T15:10:00').getTime() },
    { id: 'q3', building_code: BuildingCode.MUSHROOM_FARM, duration_seconds: 600, start_at: NOW, finish_at: new Date('2026-11-27T16:00:00').getTime() },
  ].slice(0, queue),
})

const technologiesData = ({ running = true }: { running?: boolean } = {}) => ({
  technologies: [
    { id: 't1', code: TechnologyCode.AGRONOMY, level: 2, requirement, ...(running ? { research_at: NOW + 72 * MINUTE, research_started_at: NOW - 10 * MINUTE } : {}) },
    { id: 't2', code: TechnologyCode.DETECTION, level: 0, requirement },
  ],
  research_queue: [
    { id: 'r1', technology_code: TechnologyCode.DETECTION, city_id: 'c2', city_name: 'Ferraille', duration_seconds: 60, start_at: NOW, finish_at: new Date('2026-11-27T18:05:00').getTime() },
  ],
})

const activityData = (researchCity: { id: string, name: string }) => ({
  building: null,
  building_queue_depth: 0,
  research: { code: TechnologyCode.AGRONOMY, level: 2, research_at: NOW + 72 * MINUTE, research_started_at: NOW - 10 * MINUTE, city_id: researchCity.id, city_name: researchCity.name },
  research_queue_depth: 1,
  recruitment: null,
  recruitment_queue_depth: 0,
  fortification: null,
  fortification_queue_depth: 0,
  fortification_available: true,
  movements: { count: 0, next_arrive_at: null },
})

const troopsData = ({ running = true, queue = 1, limit = 3 }: { running?: boolean, queue?: number, limit?: number } = {}) => ({
  troops: [
    {
      id: 'tr1',
      code: TroopCode.EXPLORER,
      count: 3,
      exchange_reserved: 0,
      cost: { plastic: 0, mushroom: 0, plasma: 0, duration: 0 },
      requirement,
      ...(running ? { ongoing_recruitment: { finish_at: NOW + MINUTE, remaining_count: 12, duration_per_unit: 10, started_at: NOW - MINUTE } } : {}),
    },
  ],
  recruit_queue: [
    { id: 'b1', troop_code: TroopCode.EXPLORER, count: 40 },
    { id: 'b2', troop_code: TroopCode.EXPLORER, count: 5 },
    { id: 'b3', troop_code: TroopCode.EXPLORER, count: 6 },
  ].slice(0, queue),
  recruit_queue_limit: limit,
})

const defense = (code: DefenseCode, count: number, armed: boolean) => ({
  code,
  count,
  points: 2,
  attack: 1,
  life: 1,
  armed,
  cost: { plastic: 0, mushroom: 0, plasma: 0, duration: 0 },
  requirement,
})

const defensesData = ({ wall = 5, running = false, queue = 0 }: { wall?: number, running?: boolean, queue?: number } = {}) => ({
  city_wall_level: wall,
  capacity: { total: 100, used: 60, queued: 20 },
  defenses: wall ? [ defense(DefenseCode.RAMPART, 5, false), defense(DefenseCode.TURRET, 9, true) ] : [],
  ongoing_build: running ? { defense_code: DefenseCode.TURRET, finish_at: NOW + MINUTE, remaining_count: 4, duration_per_unit: 10, started_at: NOW - MINUTE } : null,
  build_queue: [
    { id: 'd1', defense_code: DefenseCode.RAMPART, count: 2 },
    { id: 'd2', defense_code: DefenseCode.TURRET, count: 3 },
    { id: 'd3', defense_code: DefenseCode.RAMPART, count: 1 },
  ].slice(0, queue),
  build_queue_limit: wall ? 3 : 0,
})

const order = (overrides: Partial<ExchangeOrder>): ExchangeOrder => ({
  id: 'o1',
  city_id: 'c1',
  city_name: 'Nouvelle-Rouille',
  side: ExchangeSide.SELL,
  resource: ExchangeResource.PLASTIC,
  lots: 10,
  filled_lots: 3,
  price: 12,
  status: ExchangeOrderStatus.OPEN,
  created_at: NOW - MINUTE,
  closed_at: null,
  expires_at: NOW + 60 * MINUTE,
  reserved_resources: null,
  reserved_carriers: [],
  ...overrides,
})

let queryClient: QueryClient

const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)

const seedError = (queryKey: QueryKey) => {
  const query = queryClient.getQueryCache().build(queryClient, { queryKey })
  query.setState({ ...query.state, status: 'error', error: new Error('boom'), fetchStatus: 'idle' })
}

const seedAll = () => {
  queryClient.setQueryData(cityKeys.detail('c1'), city())
  queryClient.setQueryData(buildingKeys.list('c1'), buildingsData({ queue: 2 }))
  queryClient.setQueryData(technologyKeys.list('c1'), technologiesData())
  queryClient.setQueryData(activityKeys.city('c1'), activityData({ id: 'c1', name: 'Nouvelle-Rouille' }))
  queryClient.setQueryData(troopKeys.cityList('c1'), troopsData())
  queryClient.setQueryData(defenseKeys.list('c1'), defensesData())
  queryClient.setQueryData(exchangeKeys.mine, { open: [ order({}) ], closed: [] })
  queryClient.setQueryData(troopKeys.movements, [])
  queryClient.setQueryData(troopKeys.incomingMovements, [])
  queryClient.setQueryData(troopKeys.movementCapacity, { used: 0, limit: 5 })
}

const region = (name: RegExp) => screen.getByRole('region', { name })

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.useFakeTimers({ toFake: [ 'Date' ] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('BuildingQueueCard', () => {
  it('shows « Libre » with a call to action when idle', () => {
    queryClient.setQueryData(buildingKeys.list('c1'), buildingsData({ running: false }))
    wrap(<BuildingQueueCard cityId="c1" />)

    const card = region(/Construction/)
    expect(card).toHaveTextContent('Libre')
    expect(card).toHaveTextContent('Aucune construction en cours.')
    expect(within(card).getByRole('link', { name: 'Choisir un bâtiment' })).toHaveAttribute('href', '/city/c1/base/building')
    expect(card).toHaveTextContent('File 0 / 3')
  })

  it('shows the active job with its countdown and the waiting rows with their target levels', () => {
    queryClient.setQueryData(buildingKeys.list('c1'), buildingsData({ queue: 2 }))
    wrap(<BuildingQueueCard cityId="c1" />)

    const card = region(/Construction/)
    expect(card).toHaveTextContent('Centre de recyclage 4 → 5')
    expect(within(card).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '60')
    expect(card).toHaveTextContent('04:00')
    const rows = within(card).getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('2. Ferme à champignons → 4')
    expect(rows[0]).toHaveTextContent('fin 14:32')
    expect(rows[1]).toHaveTextContent('3. Centre de recyclage → 6')
    expect(card).toHaveTextContent('File 2 / 3')
  })

  it('reads « File pleine » when the queue is full', () => {
    queryClient.setQueryData(buildingKeys.list('c1'), buildingsData({ queue: 3 }))
    wrap(<BuildingQueueCard cityId="c1" />)

    expect(screen.getByText(/File pleine/)).toHaveClass('text-amber')
  })
})

describe('ResearchQueueCard', () => {
  it('names the city of the research when it runs elsewhere, and the city of every waiting row', () => {
    queryClient.setQueryData(technologyKeys.list('c1'), technologiesData())
    queryClient.setQueryData(activityKeys.city('c1'), activityData({ id: 'c2', name: 'Ferraille' }))
    wrap(<ResearchQueueCard cityId="c1" />)

    const card = region(/Recherche/)
    expect(card).toHaveTextContent('Agronomie 2 → 3 · Ferraille')
    expect(within(card).getByRole('listitem')).toHaveTextContent('2. Détection → 1 · Ferraille')
    expect(within(card).getByRole('listitem')).toHaveTextContent('fin 18:05')
    expect(card).toHaveTextContent(`File 1 / ${RESEARCH_QUEUE_LIMIT}`)
  })

  it('omits the city name when the research runs here', () => {
    queryClient.setQueryData(technologyKeys.list('c1'), technologiesData())
    queryClient.setQueryData(activityKeys.city('c1'), activityData({ id: 'c1', name: 'Nouvelle-Rouille' }))
    wrap(<ResearchQueueCard cityId="c1" />)

    expect(screen.getByText(/Agronomie 2 → 3/)).not.toHaveTextContent('Nouvelle-Rouille')
  })

  it('shows « Libre » with a call to action when idle', () => {
    queryClient.setQueryData(technologyKeys.list('c1'), { ...technologiesData({ running: false }), research_queue: [] })
    wrap(<ResearchQueueCard cityId="c1" />)

    const card = region(/Recherche/)
    expect(card).toHaveTextContent('Libre')
    expect(within(card).getByRole('link', { name: 'Choisir une technologie' })).toHaveAttribute('href', '/city/c1/base/technology')
  })
})

describe('RecruitmentQueueCard', () => {
  it('shows the running batch and the waiting batches', () => {
    queryClient.setQueryData(troopKeys.cityList('c1'), troopsData({ queue: 1 }))
    wrap(<RecruitmentQueueCard cityId="c1" />)

    const card = region(/Recrutement/)
    expect(card).toHaveTextContent('12 Explorateur')
    expect(within(card).getByRole('progressbar')).toBeInTheDocument()
    expect(within(card).getByRole('listitem')).toHaveTextContent('2. 40 Explorateur')
    expect(card).toHaveTextContent('File 1 / 3')
  })

  it('asks for a command center instead of « File 0 / 0 »', () => {
    queryClient.setQueryData(troopKeys.cityList('c1'), troopsData({ running: false, queue: 0, limit: 0 }))
    wrap(<RecruitmentQueueCard cityId="c1" />)

    const card = region(/Recrutement/)
    expect(card).toHaveTextContent('Construisez un Centre de commandement pour mettre des lots en file.')
    expect(card).not.toHaveTextContent('File 0 / 0')
    expect(within(card).getByRole('link', { name: 'Recruter' })).toHaveAttribute('href', '/city/c1/base/troop')
  })
})

describe('FortificationQueueCard', () => {
  it('requires the Enceinte', () => {
    queryClient.setQueryData(defenseKeys.list('c1'), defensesData({ wall: 0 }))
    wrap(<FortificationQueueCard cityId="c1" />)

    const card = region(/Fortification/)
    expect(card).toHaveTextContent('Enceinte requise')
    expect(card).toHaveTextContent('Construisez l\'Enceinte pour ériger des défenses.')
    expect(within(card).getByRole('link', { name: 'Voir l\'Enceinte' })).toHaveAttribute('href', '/city/c1/base/defense?code=city_wall')
    expect(card).not.toHaveTextContent('File')
  })

  it('shows the running batch and a full queue', () => {
    queryClient.setQueryData(defenseKeys.list('c1'), defensesData({ running: true, queue: 3 }))
    wrap(<FortificationQueueCard cityId="c1" />)

    const card = region(/Fortification/)
    expect(card).toHaveTextContent('4 Tourelle')
    expect(within(card).getAllByRole('listitem')).toHaveLength(3)
    expect(card).toHaveTextContent('File pleine')
  })

  it('shows « Libre » with a call to action when idle', () => {
    queryClient.setQueryData(defenseKeys.list('c1'), defensesData())
    wrap(<FortificationQueueCard cityId="c1" />)

    const card = region(/Fortification/)
    expect(card).toHaveTextContent('Libre')
    expect(within(card).getByRole('link', { name: 'Ériger des défenses' })).toBeInTheDocument()
  })
})

describe('EnergyCard', () => {
  it('shows consumption against production with the reserve', () => {
    queryClient.setQueryData(cityKeys.detail('c1'), city())
    wrap(<EnergyCard cityId="c1" />)

    const card = region(/Énergie/)
    expect(card).toHaveTextContent('120 / 150')
    expect(card).toHaveTextContent('Réserve +30')
    expect(card).toHaveTextContent('80 %')
  })

  it('shows a deficit in danger', () => {
    queryClient.setQueryData(cityKeys.detail('c1'), city({ energy_consumption: 170 }))
    wrap(<EnergyCard cityId="c1" />)

    expect(screen.getByText(/Déficit/)).toHaveClass('text-danger')
    expect(region(/Énergie/)).toHaveTextContent('Déficit −20')
  })
})

describe('DefenseCapacityCard', () => {
  it('shows points, free points, the Enceinte, armed defenses and the garrison strategy', () => {
    queryClient.setQueryData(cityKeys.detail('c1'), city({ default_combat_strategy: CombatStrategy.HOLD_THE_LINE }))
    queryClient.setQueryData(defenseKeys.list('c1'), defensesData())
    wrap(<DefenseCapacityCard cityId="c1" />)

    const card = region(/Défense/)
    expect(card).toHaveTextContent('Points 60 (+20) / 100')
    expect(within(card).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '80')
    expect(card).toHaveTextContent('libres : 20')
    expect(card).toHaveTextContent('Enceinte niveau 5')
    expect(card).toHaveTextContent('14 défenses dont 9 armées')
    expect(card).toHaveTextContent('Garnison : Tenir la ligne')
  })

  it('explains that there is no capacity without the Enceinte', () => {
    queryClient.setQueryData(defenseKeys.list('c1'), defensesData({ wall: 0 }))
    wrap(<DefenseCapacityCard cityId="c1" />)

    expect(region(/Défense/)).toHaveTextContent('Aucune capacité défensive : construisez l\'Enceinte.')
  })
})

describe('ExchangeOrdersCard', () => {
  it('lists this city\'s open orders, newest first, against the trading post level', () => {
    queryClient.setQueryData(buildingKeys.list('c1'), buildingsData({ tradingPost: 5 }))
    queryClient.setQueryData(exchangeKeys.mine, {
      open: [
        order({ id: 'a', created_at: NOW - 5 * MINUTE }),
        order({ id: 'b', side: ExchangeSide.BUY, resource: ExchangeResource.PLASMA, lots: 4, filled_lots: 0, price: 30, created_at: NOW - MINUTE }),
        order({ id: 'elsewhere', city_id: 'c2', created_at: NOW }),
        order({ id: 'c', created_at: NOW - 2 * MINUTE }),
        order({ id: 'd', created_at: NOW - 9 * MINUTE }),
      ],
      closed: [],
    })
    wrap(<ExchangeOrdersCard cityId="c1" />)

    const card = region(/Bourse/)
    expect(card).toHaveTextContent('Ordres 4 / 5')
    const rows = within(card).getAllByRole('listitem')
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('Achat plasma')
    expect(rows[0]).toHaveTextContent('0 / 4 lots')
    expect(rows[0]).toHaveTextContent('30 eau pure / lot')
    expect(within(rows[0]).getByText('Achat')).toHaveClass('text-terminal')
    expect(rows[1]).toHaveTextContent('Vente plastique')
    expect(within(card).getByRole('link', { name: '+1 autre' })).toHaveAttribute('href', '/exchange')
  })

  it('asks for a trading post when the city has none', () => {
    queryClient.setQueryData(buildingKeys.list('c1'), buildingsData({ tradingPost: 0 }))
    queryClient.setQueryData(exchangeKeys.mine, { open: [], closed: [] })
    wrap(<ExchangeOrdersCard cityId="c1" />)

    expect(region(/Bourse/)).toHaveTextContent('Construisez un Comptoir d\'échange pour placer des ordres.')
  })

  it('shows the empty state with a call to action', () => {
    queryClient.setQueryData(buildingKeys.list('c1'), buildingsData())
    queryClient.setQueryData(exchangeKeys.mine, { open: [ order({ city_id: 'c2' }) ], closed: [] })
    wrap(<ExchangeOrdersCard cityId="c1" />)

    const card = region(/Bourse/)
    expect(card).toHaveTextContent('Ordres 0 / 1')
    expect(card).toHaveTextContent('Aucun ordre ouvert.')
    expect(within(card).getByRole('link', { name: 'Placer un ordre' })).toHaveAttribute('href', '/exchange')
  })
})

describe('CityDashboard', () => {
  it('renders the header and every card in the fixed order', () => {
    seedAll()
    wrap(<CityDashboard cityId="c1" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Nouvelle-Rouille' })).toBeInTheDocument()
    expect(screen.getByText('12.7')).toBeInTheDocument()
    expect(screen.getByText(/Niveaux de bâtiments/)).toHaveTextContent('Niveaux de bâtiments 34 / 40')
    expect(screen.getAllByRole('heading', { level: 2 }).map(heading => heading.textContent?.replace(' →', ''))).toEqual([
      'Production et entrepôts',
      'Énergie',
      'Construction',
      'Recherche',
      'Recrutement',
      'Fortification',
      'Défense',
      'Bourse',
      'Mouvements',
    ])
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('puts the incoming attack alert first', () => {
    seedAll()
    queryClient.setQueryData(troopKeys.incomingMovements, [
      { id: 'i1', target: { kind: 'city', id: 'c1', name: 'Nouvelle-Rouille', coordinates: { x: 12, y: 7 } }, arrive_at: NOW + MINUTE },
    ])
    wrap(<CityDashboard cityId="c1" />)

    expect(screen.getAllByRole('heading', { level: 2 })[0]).toHaveTextContent('Attaques entrantes')
  })

  it('shows the error state of one failing card while the others render', () => {
    seedAll()
    queryClient.removeQueries({ queryKey: defenseKeys.list('c1') })
    seedError(defenseKeys.list('c1'))
    wrap(<CityDashboard cityId="c1" />)

    expect(within(region(/Fortification/)).getByText('Données indisponibles.')).toBeInTheDocument()
    expect(within(region(/Défense/)).getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
    expect(region(/Construction/)).toHaveTextContent('Centre de recyclage 4 → 5')
    expect(region(/Bourse/)).toHaveTextContent('Ordres 1 / 1')
  })

  it('shows a header skeleton and loading cards before the city is loaded', () => {
    wrap(<CityDashboard cityId="c1" />)

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
    expect(region(/Production et entrepôts/)).toHaveAttribute('aria-busy', 'true')
    expect(region(/Mouvements/)).toHaveAttribute('aria-busy', 'true')
  })
})

describe('Countdown refetch fallback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  it('invalidates the card query 3 s after a countdown ends without an event', () => {
    queryClient.setQueryData(buildingKeys.list('c1'), {
      buildings: [ building(BuildingCode.RECYCLING_PLANT, 4, { at: NOW - 100, started: NOW - 10 * MINUTE }) ],
      upgrade_queue: [],
    })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    wrap(<BuildingQueueCard cityId="c1" />)

    expect(region(/Construction/)).toHaveTextContent('Terminé')
    act(() => { vi.advanceTimersByTime(2999) })
    expect(invalidate).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1) })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: buildingKeys.list('c1') })
  })
})

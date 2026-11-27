import React from 'react'
import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  BuildingCode,
  CombatStrategy,
  DefenseCode,
  DefenseListDataResponse,
  TechnologyCode,
  TroopCode,
  TroopListDataResponse
} from '@eoneom/api-client'

import { buildingKeys } from '#building/hooks'
import { BuildingPage } from '#building/page'
import { cityKeys } from '#city/hooks'
import { defenseKeys } from '#defense/hooks'
import { DefensePage } from '#defense/page'
import { outpostKeys } from '#outpost/hooks'
import { technologyKeys } from '#technology/hooks'
import { TechnologyPage } from '#technology/page'
import { troopKeys } from '#troop/hooks'
import { OutpostTroopPage, TroopPage } from '#troop/page'
import type { BuildingItem, City, Outpost, TechnologyItem, Troop } from '#types'

/** Slice 043: the four catalogues and the outpost troop page render grouped cards from the list caches. */

vi.mock('#auth/context', () => ({ useAuth: () => ({ token: null }) }))
vi.mock('#alliance/reinforcements', () => ({
  StationedReinforcements: () => null,
  ReinforcementsAbroad: () => null,
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search }: { children: React.ReactNode, to: string, search?: Record<string, string> }) => (
    <a href={`${to}?code=${search?.code ?? ''}`}>{children}</a>
  ),
}))

const noRequirement = { buildings: [], technologies: [] }
const cost = (plastic: number) => ({ plastic, mushroom: 10, plasma: 0, duration: 60 })

const city = {
  id: 'c1',
  name: 'Rouille',
  default_combat_strategy: CombatStrategy.BALANCED,
  plastic: 500,
  mushroom: 500,
  plasma: 0,
  water: 0,
  maximum_building_levels: 100,
  building_levels_used: 10,
  earnings_per_second: { plastic: 1, mushroom: 1, plasma: 0, water: 0 },
  warehouses_capacity: { plastic: 10_000, mushroom: 10_000 },
} as unknown as City

const buildings: BuildingItem[] = [
  { id: 'b1', code: BuildingCode.RECYCLING_PLANT, level: 3, upgrade_cost: cost(100), requirement: noRequirement },
  { id: 'b2', code: BuildingCode.PLASTIC_WAREHOUSE, level: 1, upgrade_cost: cost(900), requirement: noRequirement },
  {
    id: 'b3',
    code: BuildingCode.TRADING_POST,
    level: 0,
    upgrade_cost: cost(100),
    requirement: { buildings: [ { code: BuildingCode.RESEARCH_LAB, level: 2 } ], technologies: [] },
  },
  { id: 'b4', code: BuildingCode.RESEARCH_LAB, level: 1, upgrade_cost: cost(100), requirement: noRequirement },
  { id: 'b5', code: BuildingCode.CITY_WALL, level: 2, upgrade_cost: cost(100), requirement: noRequirement },
]

const technologies: TechnologyItem[] = [
  { id: 't1', code: TechnologyCode.ARCHITECTURE, level: 1, requirement: noRequirement, research_cost: cost(100) },
  { id: 't2', code: TechnologyCode.ESPIONAGE, level: 0, requirement: noRequirement, research_cost: cost(100) },
]

const troopRow = (id: string, code: TroopCode, count: number): TroopListDataResponse['troops'][number] => ({
  id,
  code,
  count,
  exchange_reserved: 0,
  cost: cost(20),
  requirement: noRequirement,
})

const defenses: DefenseListDataResponse = {
  city_wall_level: 2,
  capacity: { total: 40, used: 4, queued: 0 },
  defenses: [
    { code: DefenseCode.RAMPART, count: 2, points: 2, attack: 0, life: 40, armed: false, cost: cost(50), requirement: noRequirement },
    { code: DefenseCode.FIELD_ARTILLERY, count: 0, points: 4, attack: 12, life: 30, armed: true, cost: cost(50), requirement: noRequirement },
  ],
  ongoing_build: null,
  build_queue: [],
  build_queue_limit: 3,
}

let queryClient: QueryClient

const renderWithCache = (ui: React.ReactElement) => render(
  <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
)

describe('catalogue pages (043)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', undefined)
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
    queryClient.setQueryData(cityKeys.detail('c1'), city)
    queryClient.setQueryData(buildingKeys.list('c1'), { buildings, upgrade_queue: [] })
    queryClient.setQueryData(technologyKeys.list('c1'), { technologies, research_queue: [] })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the building families, the collapsed queue panel and the card states', () => {
    renderWithCache(<BuildingPage cityId="c1" selectedCode={null} onSelect={() => undefined} />)

    expect(screen.getByText('Aucune construction en cours')).toBeInTheDocument()
    expect(screen.getByRole('listbox', { name: 'Production' })).toBeInTheDocument()
    expect(screen.getByRole('listbox', { name: 'Stockage' })).toBeInTheDocument()
    const special = screen.getByRole('listbox', { name: 'Spécial' })
    expect(within(special).getAllByRole('option').map(option => option.dataset.code))
      .toEqual([ BuildingCode.TRADING_POST, BuildingCode.RESEARCH_LAB ])
    expect(screen.queryByRole('option', { name: 'Enceinte' })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Centre de recyclage' })).toHaveTextContent('Améliorable')
    expect(screen.getByRole('option', { name: "Entrepôt de plastique" })).toHaveTextContent('Ressources insuffisantes · dans 6 min')
    expect(screen.getByRole('option', { name: "Comptoir d'échange" })).toHaveTextContent('Requiert : Laboratoire de recherche niv. 2')
  })

  it('shows the selected building with the action block right under the header', () => {
    queryClient.setQueryData(buildingKeys.detail('c1', BuildingCode.TRADING_POST), {
      code: BuildingCode.TRADING_POST,
      level: 0,
      upgrade_cost: cost(100),
      requirement: { buildings: [ { code: BuildingCode.RESEARCH_LAB, level: 2 } ], technologies: [] },
      metadata: { open_order_count: 0, current_open_order_limit: 0, next_open_order_limit: 1 },
    })
    renderWithCache(<BuildingPage cityId="c1" selectedCode={BuildingCode.TRADING_POST} onSelect={() => undefined} />)

    expect(screen.getByRole('option', { name: "Comptoir d'échange" })).toHaveAttribute('aria-selected', 'true')
    const action = screen.getByRole('region', { name: 'Action' })
    expect(within(action).getByText('Pré-requis')).toBeInTheDocument()
    expect(within(action).getByText('Coût')).toBeInTheDocument()
    expect(within(action).getByRole('button', { name: 'Construire' })).toBeInTheDocument()
    expect(within(action).getByRole('link', { name: 'Laboratoire de recherche' }))
      .toHaveAttribute('href', '/city/$cityId/base/building?code=research_lab')
    expect(action.compareDocumentPosition(screen.getByText(/Un guichet blindé/)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('renders the technology branches and the research queue panel', () => {
    renderWithCache(<TechnologyPage cityId="c1" selectedCode={null} onSelect={() => undefined} />)

    expect(screen.getByText('Aucune recherche en cours')).toBeInTheDocument()
    expect(screen.getByRole('listbox', { name: 'Fondations' })).toBeInTheDocument()
    expect(screen.getByRole('listbox', { name: 'Renseignement' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Architecture' })).toHaveTextContent('Recherchable')
  })

  it('renders troops by role and resolves the selected code to its row for the details', () => {
    queryClient.setQueryData(troopKeys.cityList('c1'), {
      troops: [ troopRow('r1', TroopCode.LEGIONNAIRE, 5), troopRow('r2', TroopCode.EXPLORER, 0) ],
      recruit_queue: [],
      recruit_queue_limit: 0,
    })
    const troop: Troop = { id: 'r1', code: TroopCode.LEGIONNAIRE, count: 5, cost: cost(20), requirement: noRequirement }
    queryClient.setQueryData(troopKeys.detail('r1'), troop)

    renderWithCache(<TroopPage cityId="c1" selectedCode={TroopCode.LEGIONNAIRE} onSelect={() => undefined} />)

    expect(screen.getByText('Aucun recrutement en cours')).toBeInTheDocument()
    expect(screen.getByRole('listbox', { name: 'Combat' })).toBeInTheDocument()
    expect(screen.getByRole('listbox', { name: 'Reconnaissance' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Masquer les unités absentes' })).not.toBeChecked()
    expect(screen.getByRole('heading', { level: 2, name: 'Légionnaire' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recruter' })).toBeInTheDocument()
  })

  it('renders the Enceinte card, then common and faction defenses', () => {
    queryClient.setQueryData(defenseKeys.list('c1'), defenses)
    renderWithCache(<DefensePage cityId="c1" selectedCode={null} onSelect={() => undefined} />)

    expect(screen.getByText('Aucune fortification en cours')).toBeInTheDocument()
    const groups = screen.getAllByRole('listbox').map(listbox => listbox.getAttribute('aria-label'))
    expect(groups).toEqual([ 'Enceinte', 'Défenses communes', 'Défenses de faction' ])
    const wall = screen.getByRole('option', { name: 'Enceinte' })
    expect(wall).toHaveClass('col-span-full')
    expect(wall).toHaveTextContent('Niv. 2')
    expect(wall).toHaveTextContent('Points de défense : 4 / 40')
    expect(screen.getByRole('option', { name: 'Rempart' })).toHaveTextContent('ATK 0 / VIE 40 · 2 pts')
  })

  it('renders the read-only outpost troop grid and details', () => {
    queryClient.setQueryData(troopKeys.outpostList('o1'), [
      troopRow('o-r1', TroopCode.LEGIONNAIRE, 3),
      troopRow('o-r2', TroopCode.EXPLORER, 0),
    ])
    queryClient.setQueryData(outpostKeys.detail('o1'), {
      id: 'o1',
      default_combat_strategy: CombatStrategy.BALANCED,
    } as unknown as Outpost)
    const troop: Troop = { id: 'o-r1', code: TroopCode.LEGIONNAIRE, count: 3, cost: cost(20), requirement: noRequirement }
    queryClient.setQueryData(troopKeys.detail('o-r1'), troop)

    renderWithCache(<OutpostTroopPage outpostId="o1" selectedCode={TroopCode.LEGIONNAIRE} onSelect={() => undefined} />)

    expect(screen.getByRole('heading', { name: 'Défense de la garnison' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Masquer les verrouillés' })).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Masquer les unités absentes' })).toBeChecked()
    const card = screen.getByRole('option', { name: 'Légionnaire' })
    expect(card).toHaveTextContent('× 3')
    expect(card.querySelector('.catalogue-badge')).toBeNull()
    expect(card.querySelector('.catalogue-card__cost')).toBeNull()
    expect(screen.queryByRole('option', { name: 'Explorateur' })).not.toBeInTheDocument()
    expect(screen.getByText('Stationnées ici :')).toBeInTheDocument()
    expect(screen.queryByText('Coût')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Recruter' })).not.toBeInTheDocument()
  })
})

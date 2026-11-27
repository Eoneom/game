import React from 'react'
import { act, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  BuildingCode,
  DefenseCode,
  OutpostType,
  TechnologyCode,
  TroopCode,
  type LocationActivityDataResponse,
  type TroopIncomingMovement,
} from '@eoneom/api-client'

import { BuildingTranslations } from '#building/translations'
import { TechnologyTranslations } from '#technology/translations'
import { TroopTranslations } from '#troop/translations'
import { DefenseTranslations } from '#defense/translations'

let pathname = '/'
let location: { cityId: string | null, outpostId: string | null } = { cityId: null, outpostId: null }
let activity: LocationActivityDataResponse | undefined
let incoming: TroopIncomingMovement[] = []
let capacity: { used: number, limit: number } | undefined
let isAdmin = false
let unreadReports = 0
let unreadMail = 0
const outpostType = { value: OutpostType.PERMANENT }

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
        (href, [ key, value ]) => href.replace(`$${key}`, value),
        to
      )}
      {...props}
    >
      {children}
    </a>
  ),
  useLocation: () => ({ pathname }),
}))
vi.mock('#location/context', () => ({ useLocation: () => location }))
vi.mock('#location/activity-hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('#location/activity-hooks')>()),
  useLocationActivity: () => ({ data: activity }),
}))
vi.mock('#auth/hooks', () => ({ useLogout: () => ({ mutate: vi.fn() }) }))
vi.mock('#communication/report/hooks', () => ({ useCountUnreadReports: () => ({ data: unreadReports }) }))
vi.mock('#communication/mail/hooks', () => ({ useCountUnreadMail: () => ({ data: unreadMail }) }))
vi.mock('#admin/system-player-observability/hooks', () => ({ useObservabilitySession: () => ({ data: { is_admin: isAdmin } }) }))
vi.mock('#city/hooks', () => ({
  useGetCity: (cityId: string | null) => ({ data: cityId ? { id: cityId, name: 'Nouvelle-Rouille' } : undefined }),
}))
vi.mock('#outpost/hooks', () => ({
  useGetOutpost: (outpostId: string | null) => ({
    data: outpostId ? { id: outpostId, coordinates: { x: 12, y: 9 }, type: outpostType.value } : undefined,
  }),
}))
vi.mock('#troop/hooks', () => ({
  useListIncomingMovements: () => ({ data: incoming }),
  useMovementCapacity: () => ({ data: capacity }),
}))

import { NavMenu } from './index'

const emptyActivity = (overrides: Partial<LocationActivityDataResponse> = {}): LocationActivityDataResponse => ({
  building: null,
  building_queue_depth: 0,
  research: null,
  research_queue_depth: 0,
  recruitment: null,
  recruitment_queue_depth: 0,
  fortification: null,
  fortification_queue_depth: 0,
  fortification_available: true,
  movements: { count: 0, next_arrive_at: null },
  ...overrides,
})

const attack = (overrides: Partial<TroopIncomingMovement['target']> & { arrive_at?: number } = {}): TroopIncomingMovement => ({
  id: `m-${Math.random()}`,
  target: {
    kind: overrides.kind ?? 'city',
    id: overrides.id ?? 'c1',
    name: null,
    coordinates: { x: 1, y: 1 },
  },
  arrive_at: overrides.arrive_at ?? Date.now() + 90_000,
})

let queryClient: QueryClient

const renderMenu = () => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <NavMenu />
    </QueryClientProvider>
  )
}

const entry = (name: string | RegExp) => screen.getByRole('link', { name })

describe('NavMenu', () => {
  beforeEach(() => {
    pathname = '/city/c1/base/'
    location = { cityId: 'c1', outpostId: null }
    activity = emptyActivity()
    incoming = []
    capacity = { used: 3, limit: 7 }
    isAdmin = false
    unreadReports = 0
    unreadMail = 0
    outpostType.value = OutpostType.PERMANENT
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lists the city entries with their routes', () => {
    renderMenu()

    expect(screen.getByRole('navigation', { name: 'Navigation principale' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Colonie' })).toBeInTheDocument()
    expect(screen.getByText('Nouvelle-Rouille')).toBeInTheDocument()
    expect(entry('Tableau de bord')).toHaveAttribute('href', '/city/c1/base/')
    expect(entry('Bâtiments')).toHaveAttribute('href', '/city/c1/base/building')
    expect(entry('Technologies')).toHaveAttribute('href', '/city/c1/base/technology')
    expect(entry('Troupes')).toHaveAttribute('href', '/city/c1/base/troop')
    expect(entry('Défense')).toHaveAttribute('href', '/city/c1/base/defense')
    expect(entry(/^Déplacements/)).toHaveAttribute('href', '/city/c1/world/movement')
    expect(entry('Carte')).toHaveAttribute('href', '/city/c1/world/map')
  })

  it('lists only Tableau de bord, Déplacements and Carte for an outpost', () => {
    location = { cityId: null, outpostId: 'o1' }
    pathname = '/outpost/o1'
    outpostType.value = OutpostType.TEMPORARY
    renderMenu()

    expect(screen.getByRole('heading', { name: 'Avant-poste' })).toBeInTheDocument()
    expect(screen.getByText('12.9')).toBeInTheDocument()
    expect(screen.getByText('Temporaire')).toBeInTheDocument()
    expect(entry('Tableau de bord')).toHaveAttribute('href', '/outpost/o1')
    expect(entry(/^Déplacements/)).toHaveAttribute('href', '/outpost/o1/world/movement')
    expect(entry('Carte')).toHaveAttribute('href', '/outpost/o1/world/map')
    for (const name of [ 'Bâtiments', 'Technologies', 'Troupes', 'Défense' ]) {
      expect(screen.queryByRole('link', { name })).not.toBeInTheDocument()
    }
  })

  it('lists the empire entries with unread badges hidden at 0', () => {
    const { unmount } = renderMenu()
    expect(entry('Rapports')).toHaveAttribute('href', '/inbox/report')
    expect(entry('Courrier')).toHaveAttribute('href', '/inbox/mail')
    expect(entry('Alliance')).toHaveAttribute('href', '/alliance')
    expect(entry('Classements')).toHaveAttribute('href', '/ranking')
    expect(entry('Bourse')).toHaveAttribute('href', '/exchange')
    expect(screen.queryByText(/non lus/)).not.toBeInTheDocument()
    unmount()

    unreadReports = 3
    unreadMail = 1
    renderMenu()
    expect(entry('Rapports 3 non lus')).toBeInTheDocument()
    expect(entry('Courrier 1 non lus')).toBeInTheDocument()
  })

  it('shows the admin entry only to admins', () => {
    const { unmount } = renderMenu()
    expect(screen.queryByRole('link', { name: 'Observabilité IA' })).not.toBeInTheDocument()
    unmount()

    isAdmin = true
    renderMenu()
    expect(entry('Observabilité IA')).toHaveAttribute('href', '/admin')
  })

  it('marks the current entry with aria-current (dashboard exact, others with sub-paths)', () => {
    const { unmount } = renderMenu()
    expect(entry('Tableau de bord')).toHaveAttribute('aria-current', 'page')
    expect(entry('Bâtiments')).not.toHaveAttribute('aria-current')
    unmount()

    pathname = '/city/c1/world/movement/abc'
    renderMenu()
    expect(entry('Tableau de bord')).not.toHaveAttribute('aria-current')
    expect(entry(/^Déplacements/)).toHaveAttribute('aria-current', 'page')
  })

  it('shows « Libre » for idle slots', () => {
    renderMenu()

    expect(within(entry('Bâtiments')).getByText('Libre')).toHaveClass('text-terminal')
    expect(within(entry('Technologies')).getByText('Libre')).toBeInTheDocument()
    expect(within(entry('Troupes')).getByText('Libre')).toBeInTheDocument()
    expect(within(entry('Défense')).getByText('Libre')).toBeInTheDocument()
  })

  it('shows a running building with its next level, progress bar, time left and queue depth', () => {
    const now = Date.now()
    activity = emptyActivity({
      building: { code: BuildingCode.RECYCLING_PLANT, level: 4, upgrade_started_at: now - 100_000, upgrade_at: now + 252_000 },
      building_queue_depth: 2,
    })
    renderMenu()

    const name = BuildingTranslations[BuildingCode.RECYCLING_PLANT].name
    const link = entry(/^Bâtiments/)
    expect(link).toHaveAccessibleName('Bâtiments +2 en file')
    expect(within(link).getByText(`${name} → 5`)).toBeInTheDocument()
    const bar = within(link).getByRole('progressbar')
    expect(bar.getAttribute('aria-valuetext')).toMatch(new RegExp(`^${name} niveau 5, 04:1[12] restantes$`))
    const time = within(link).getByText(/^04:1[12]$/)
    expect(time).not.toHaveClass('font-semibold')
  })

  it('highlights the time when the job is about to finish', () => {
    const now = Date.now()
    activity = emptyActivity({
      recruitment: { code: TroopCode.RECYCLER, remaining_count: 7, started_at: now - 600_000, finish_at: now + 30_000 },
    })
    renderMenu()

    const link = entry(/^Troupes/)
    expect(within(link).getByText(`7 ${TroopTranslations[TroopCode.RECYCLER].name}`)).toBeInTheDocument()
    expect(within(link).getByText(/^00:(29|30)$/)).toHaveClass('font-semibold', 'text-amber')
  })

  it('shows « Terminé » and refreshes the activity once the countdown reaches 0', async () => {
    const now = Date.now()
    activity = emptyActivity({
      fortification: { code: DefenseCode.TURRET, remaining_count: 1, started_at: now - 60_000, finish_at: now - 1 },
    })
    const spy = vi.spyOn(QueryClient.prototype, 'invalidateQueries')
    renderMenu()
    await act(async () => {})

    expect(within(entry(/^Défense/)).getByText('Terminé')).toBeInTheDocument()
    expect(spy).toHaveBeenCalledWith({ queryKey: [ 'activity' ] })
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('shows « Enceinte requise » without a city wall', () => {
    activity = emptyActivity({ fortification_available: false })
    renderMenu()

    expect(within(entry(/^Défense/)).getByText('Enceinte requise')).toHaveClass('text-label')
  })

  it('shows a running fortification batch with the queue depth', () => {
    const now = Date.now()
    activity = emptyActivity({
      fortification: { code: DefenseCode.TURRET, remaining_count: 4, started_at: now - 1_000, finish_at: now + 600_000 },
      fortification_queue_depth: 1,
    })
    renderMenu()

    const link = entry(/^Défense/)
    expect(link).toHaveAccessibleName('Défense +1 en file')
    expect(within(link).getByText(`4 ${DefenseTranslations[DefenseCode.TURRET].name}`)).toBeInTheDocument()
  })

  it('names the city of a research running elsewhere', () => {
    const now = Date.now()
    const research = {
      code: TechnologyCode.ARCHITECTURE,
      level: 2,
      research_started_at: now - 1_000,
      research_at: now + 4_000_000,
    }
    activity = emptyActivity({ research: { ...research, city_id: 'c2', city_name: 'Ferraille' }, research_queue_depth: 3 })
    const { unmount } = renderMenu()

    const link = entry(/^Technologies/)
    expect(link).toHaveAccessibleName('Technologies +3 en file')
    expect(within(link).getByText(`${TechnologyTranslations[TechnologyCode.ARCHITECTURE].name} → 3`)).toBeInTheDocument()
    expect(within(link).getByText('· Ferraille')).toBeInTheDocument()
    unmount()

    activity = emptyActivity({ research: { ...research, city_id: 'c1', city_name: 'Nouvelle-Rouille' } })
    renderMenu()
    expect(within(entry(/^Technologies/)).queryByText(/·/)).not.toBeInTheDocument()
  })

  it('shows the movement cap, red when full, and the next arrival', () => {
    const { unmount } = renderMenu()
    const link = entry(/^Déplacements/)
    expect(within(link).getByText('3/7')).toHaveClass('text-label')
    expect(within(link).getByText('Aucun')).toBeInTheDocument()
    unmount()

    capacity = { used: 7, limit: 7 }
    activity = emptyActivity({ movements: { count: 2, next_arrive_at: Date.now() + 42_000 } })
    renderMenu()
    const full = entry(/^Déplacements/)
    expect(within(full).getByText('7/7').closest('.font-mono')).toHaveClass('text-danger')
    expect(within(full).getByText(/Prochaine arrivée/)).toHaveTextContent(/Prochaine arrivée 00:4[12]/)
  })

  it('shows incoming attacks on the current location only', () => {
    incoming = [
      attack({ id: 'c1', arrive_at: Date.now() + 120_000 }),
      attack({ id: 'c1', arrive_at: Date.now() + 61_000 }),
      attack({ id: 'c2' }),
    ]
    const { unmount } = renderMenu()

    const link = entry(/^Déplacements/)
    expect(within(link).getByText(/2 attaques entrantes/)).toHaveClass('text-danger')
    expect(within(link).getByText(/2 attaques entrantes/)).toHaveTextContent(/· 01:0[01]/)
    expect(link).toHaveClass('border-danger')
    unmount()

    incoming = [ attack({ id: 'c2' }), attack({ kind: 'outpost', id: 'c1' }) ]
    renderMenu()
    expect(within(entry(/^Déplacements/)).queryByText(/attaque/)).not.toBeInTheDocument()
  })
})

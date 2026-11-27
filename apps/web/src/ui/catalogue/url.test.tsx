import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BuildingCode, DefenseCode, TechnologyCode, TroopCode } from '@eoneom/api-client'

/** Slice 043: catalogue routes keep the selection in `?code=`. */

const navigate = vi.fn()
let search: Record<string, unknown> = {}

interface FakeRoute {
  options: {
    validateSearch: (search: Record<string, unknown>) => { code?: string }
    component: React.FC
  }
}

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: FakeRoute['options']) => ({
    options,
    useParams: () => ({ cityId: 'c1', outpostId: 'o1' }),
    useSearch: () => search,
    useNavigate: () => navigate,
  }),
}))

interface PageProps {
  selectedCode: string | null
  onSelect: (code: string) => void
}

const fakePage = (next: string) => (props: PageProps) => (
  <button type="button" onClick={() => props.onSelect(next)}>
    {`selected:${props.selectedCode ?? 'none'}`}
  </button>
)

vi.mock('#building/page', () => ({ BuildingPage: fakePage('mushroom_farm') }))
vi.mock('#technology/page', () => ({ TechnologyPage: fakePage('architecture') }))
vi.mock('#troop/page', () => ({ TroopPage: fakePage('legionnaire'), OutpostTroopPage: fakePage('explorer') }))
vi.mock('#defense/page', () => ({ DefensePage: fakePage('city_wall') }))

const routes = async () => ({
  building: (await import('../../routes/city/$cityId/base/building')).Route as unknown as FakeRoute,
  technology: (await import('../../routes/city/$cityId/base/technology')).Route as unknown as FakeRoute,
  troop: (await import('../../routes/city/$cityId/base/troop')).Route as unknown as FakeRoute,
  defense: (await import('../../routes/city/$cityId/base/defense')).Route as unknown as FakeRoute,
  outpostTroop: (await import('../../routes/outpost/$outpostId/troop')).Route as unknown as FakeRoute,
})

describe('catalogue routes ?code= (043)', () => {
  beforeEach(() => {
    navigate.mockReset()
    search = {}
  })

  it('keeps known codes and drops unknown ones', async () => {
    const { building, technology, troop, defense, outpostTroop } = await routes()

    expect(building.options.validateSearch({ code: BuildingCode.RESEARCH_LAB })).toEqual({ code: BuildingCode.RESEARCH_LAB })
    expect(building.options.validateSearch({ code: 'nope' })).toEqual({ code: undefined })
    // The Enceinte is selected from the Défense tab.
    expect(building.options.validateSearch({ code: BuildingCode.CITY_WALL })).toEqual({ code: undefined })
    expect(technology.options.validateSearch({ code: TechnologyCode.ESPIONAGE })).toEqual({ code: TechnologyCode.ESPIONAGE })
    expect(technology.options.validateSearch({ code: 42 })).toEqual({ code: undefined })
    expect(troop.options.validateSearch({ code: TroopCode.SETTLER })).toEqual({ code: TroopCode.SETTLER })
    expect(defense.options.validateSearch({ code: 'city_wall' })).toEqual({ code: 'city_wall' })
    expect(defense.options.validateSearch({ code: DefenseCode.RAILGUN })).toEqual({ code: DefenseCode.RAILGUN })
    expect(defense.options.validateSearch({ code: BuildingCode.RESEARCH_LAB })).toEqual({ code: undefined })
    expect(outpostTroop.options.validateSearch({ code: TroopCode.EXPLORER })).toEqual({ code: TroopCode.EXPLORER })
  })

  it('selects from the URL on load', async () => {
    const { building } = await routes()
    search = { code: BuildingCode.RESEARCH_LAB }
    const Component = building.options.component
    render(<Component />)
    expect(screen.getByRole('button')).toHaveTextContent('selected:research_lab')
  })

  it('shows no selection without a code', async () => {
    const { technology } = await routes()
    const Component = technology.options.component
    render(<Component />)
    expect(screen.getByRole('button')).toHaveTextContent('selected:none')
  })

  it.each([
    [ 'building', 'mushroom_farm' ],
    [ 'technology', 'architecture' ],
    [ 'troop', 'legionnaire' ],
    [ 'defense', 'city_wall' ],
    [ 'outpostTroop', 'explorer' ],
  ] as const)('replaces the history entry when a %s card is selected', async (name, code) => {
    const Component = (await routes())[name].options.component
    render(<Component />)
    await userEvent.click(screen.getByRole('button'))
    expect(navigate).toHaveBeenCalledWith({ search: { code }, replace: true })
  })
})

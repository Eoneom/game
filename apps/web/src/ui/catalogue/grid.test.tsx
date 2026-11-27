import React, { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CatalogueCardData } from '#ui/catalogue/card'
import { catalogueSettingKey } from '#ui/catalogue/filter'
import { CatalogueGroup, CatalogueGrid } from '#ui/catalogue/grid'

const card = (code: string, overrides: Partial<CatalogueCardData> = {}): CatalogueCardData => ({
  code,
  name: `Carte ${code}`,
  image: `/${code}.png`,
  amount: { kind: 'level', value: 1 },
  state: { kind: 'available', catalogue: 'building' },
  ...overrides,
})

const locked = (code: string): CatalogueCardData => card(code, {
  state: { kind: 'missing_requirement', first: { name: 'Laboratoire de recherche', level: 3 }, more: 0 },
})

// First group: 6 cards on 4 columns (a row of 4, a row of 2); second group: 3 cards.
const groups: CatalogueGroup[] = [
  { id: 'production', title: 'Production', cards: [ 'a', 'b', 'c', 'd', 'e', 'f' ].map(code => card(code)) },
  { id: 'storage', title: 'Stockage', cards: [ 'g', 'h', 'i' ].map(code => card(code)) },
]

const Harness: React.FC<{
  groups: CatalogueGroup[]
  initial?: string | null
  onSelect?: (code: string) => void
  absentFilterDefault?: boolean
}> = ({ groups: input, initial = null, onSelect, absentFilterDefault }) => {
  const [selected, setSelected] = useState<string | null>(initial)
  return (
    <CatalogueGrid
      scope="building"
      groups={input}
      selectedCode={selected}
      onSelect={code => {
        setSelected(code)
        onSelect?.(code)
      }}
      queue={<p>File de construction</p>}
      absentFilterDefault={absentFilterDefault}
    />
  )
}

const option = (code: string) => screen.getByRole('option', { name: `Carte ${code}` })

let store: Record<string, string>

const stubStorage = () => {
  store = {}
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
  })
}

describe('CatalogueGrid (043)', () => {
  beforeEach(() => {
    stubStorage()
    // jsdom has no layout: the listboxes report a 4-column grid.
    const realGetComputedStyle = window.getComputedStyle.bind(window)
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => {
      const style = realGetComputedStyle(element, pseudo)
      if (element.getAttribute('role') !== 'listbox') {
        return style
      }
      return new Proxy(style, {
        get: (target, property) => {
          if (property === 'gridTemplateColumns') return '240px 240px 240px 240px'
          const value = Reflect.get(target, property)
          return typeof value === 'function' ? value.bind(target) : value
        },
      })
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders the queue slot, the toolbar and one titled listbox per group', () => {
    render(<Harness groups={groups} />)
    expect(screen.getByText('File de construction')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Masquer les verrouillés' })).not.toBeChecked()
    expect(screen.queryByRole('checkbox', { name: 'Masquer les unités absentes' })).not.toBeInTheDocument()
    expect(within(screen.getByRole('listbox', { name: 'Production' })).getAllByRole('option')).toHaveLength(6)
    expect(within(screen.getByRole('listbox', { name: 'Stockage' })).getAllByRole('option')).toHaveLength(3)
  })

  it('drops empty groups', () => {
    render(<Harness groups={[ ...groups, { id: 'military', title: 'Militaire', cards: [] } ]} />)
    expect(screen.queryByRole('button', { name: /Militaire/ })).not.toBeInTheDocument()
  })

  it('uses a roving tabindex that enters on the selected card', () => {
    render(<Harness groups={groups} initial="h" />)
    expect(option('h')).toHaveAttribute('tabindex', '0')
    expect(screen.getAllByRole('option').filter(element => element.getAttribute('tabindex') === '0')).toHaveLength(1)
  })

  it('enters on the first card without a selection and leaves the grid on the next Tab', async () => {
    render(<Harness groups={groups} />)
    await userEvent.tab() // « Masquer les verrouillés »
    await userEvent.tab() // « Production » title
    await userEvent.tab()
    expect(option('a')).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: /Stockage/ })).toHaveFocus()
  })

  it('moves with the arrows across a 4-column grid and across groups', async () => {
    render(<Harness groups={groups} />)
    option('a').focus()

    await userEvent.keyboard('{ArrowRight}')
    expect(option('b')).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    expect(option('f')).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    expect(option('h')).toHaveFocus()
    expect(option('h')).toHaveAttribute('tabindex', '0')
    expect(option('a')).toHaveAttribute('tabindex', '-1')
    await userEvent.keyboard('{ArrowUp}')
    expect(option('f')).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    expect(option('g')).toHaveFocus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(option('f')).toHaveFocus()
  })

  it('goes to the ends with Home / End and selects with Enter or Space', async () => {
    const onSelect = vi.fn()
    render(<Harness groups={groups} onSelect={onSelect} />)
    option('c').focus()

    await userEvent.keyboard('{End}')
    expect(option('i')).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(onSelect).toHaveBeenLastCalledWith('i')
    expect(option('i')).toHaveAttribute('aria-selected', 'true')

    await userEvent.keyboard('{Home}')
    expect(option('a')).toHaveFocus()
    await userEvent.keyboard(' ')
    expect(onSelect).toHaveBeenLastCalledWith('a')
  })

  it('hides locked cards, keeps the selected one and shows the hidden count', async () => {
    render(<Harness
      groups={[
        { id: 'production', title: 'Production', cards: [ card('a'), locked('b'), locked('c'), locked('d') ] },
        { id: 'storage', title: 'Stockage', cards: [ locked('e') ] },
      ]}
      initial="d"
    />)

    await userEvent.click(screen.getByRole('checkbox', { name: 'Masquer les verrouillés' }))

    expect(screen.queryByRole('option', { name: 'Carte b' })).not.toBeInTheDocument()
    expect(option('d')).toBeInTheDocument()
    expect(screen.getByText('2 verrouillés masqués')).toBeInTheDocument()
    // A group whose cards are all hidden keeps its title and the line.
    expect(screen.getByRole('button', { name: /Stockage/ })).toBeInTheDocument()
    expect(screen.queryByRole('listbox', { name: 'Stockage' })).not.toBeInTheDocument()
    expect(screen.getByText('1 verrouillé masqué')).toBeInTheDocument()
    expect(store[catalogueSettingKey('building', 'hide_locked')]).toBe('true')
  })

  it('reads the persisted filter', () => {
    store[catalogueSettingKey('building', 'hide_locked')] = 'true'
    render(<Harness groups={[ { id: 'production', title: 'Production', cards: [ card('a'), locked('b') ] } ]} />)
    expect(screen.getByRole('checkbox', { name: 'Masquer les verrouillés' })).toBeChecked()
    expect(screen.queryByRole('option', { name: 'Carte b' })).not.toBeInTheDocument()
  })

  it('falls back to showing everything when localStorage fails', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') },
    })
    render(<Harness groups={[ { id: 'production', title: 'Production', cards: [ card('a'), locked('b') ] } ]} />)
    expect(screen.getByRole('checkbox', { name: 'Masquer les verrouillés' })).not.toBeChecked()
    expect(option('b')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('checkbox', { name: 'Masquer les verrouillés' }))
    expect(screen.queryByRole('option', { name: 'Carte b' })).not.toBeInTheDocument()
  })

  it('falls back to defaults on a malformed stored value', () => {
    store[catalogueSettingKey('building', 'hide_locked')] = '"yes"'
    store[catalogueSettingKey('building', 'collapsed')] = '{'
    render(<Harness groups={groups} />)
    expect(screen.getByRole('checkbox', { name: 'Masquer les verrouillés' })).not.toBeChecked()
    expect(screen.getByRole('listbox', { name: 'Production' })).toBeInTheDocument()
  })

  it('collapses and expands a group from its title and remembers it', async () => {
    render(<Harness groups={groups} />)
    const title = screen.getByRole('button', { name: /Production/ })
    expect(title).toHaveAttribute('aria-expanded', 'true')

    await userEvent.click(title)
    expect(title).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('listbox', { name: 'Production' })).not.toBeInTheDocument()
    expect(JSON.parse(store[catalogueSettingKey('building', 'collapsed')])).toEqual([ 'production' ])

    await userEvent.click(title)
    expect(screen.getByRole('listbox', { name: 'Production' })).toBeInTheDocument()
  })

  it('hides absent units when the absent filter is on by default', () => {
    render(<Harness
      groups={[ {
        id: 'combat',
        title: 'Combat',
        cards: [
          card('a', { amount: { kind: 'count', value: 0 }, state: { kind: 'none' } }),
          card('b', { amount: { kind: 'count', value: 4 }, state: { kind: 'none' } }),
        ],
      } ]}
      absentFilterDefault
    />)
    expect(screen.getByRole('checkbox', { name: 'Masquer les unités absentes' })).toBeChecked()
    expect(screen.queryByRole('option', { name: 'Carte a' })).not.toBeInTheDocument()
    expect(option('b')).toBeInTheDocument()
    expect(screen.getByText('1 unité absente masquée')).toBeInTheDocument()
  })
})

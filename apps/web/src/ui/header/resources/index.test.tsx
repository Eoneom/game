import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { City, Outpost } from '#types'
import { CombatStrategy, OutpostType } from '@eoneom/api-client'

import { ResourcePanelProvider } from './context'
import { HeaderResources } from './index'

let pathname = '/city/city-1/base/'

vi.mock('@tanstack/react-router', () => ({
  useLocation: () => ({ pathname }),
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
  earnings_per_second: { plastic: 0.1, mushroom: 0.2, plasma: 0, water: 0 },
  pre_cell_earnings_per_second: { plastic: 0.1, mushroom: 0.2, plasma: 0, water: 0 },
  cell_resource_coefficient: { plastic: 1, mushroom: 1 },
  technology_production_multiplier: { plastic: 1, mushroom: 1, plasma: 1, water: 1 },
  faction_production_multiplier: { plastic: 1, mushroom: 1 },
  warehouses_capacity: { plastic: 1000, mushroom: 1000 },
  warehouse_space_remaining: { plastic: 990, mushroom: 980 },
  warehouse_full_in_seconds: { plastic: 0, mushroom: 0 },
  energy: 0,
  pre_cell_energy: 0,
  neutral_photovoltaic_energy: 0,
  cell_solar_coefficient: 1,
  photovoltaic_optimization_level: 0,
  energy_consumption: 0,
  production_energy_ratio: 1,
  ...overrides,
})

const minimalOutpost = (overrides: Partial<Outpost> = {}): Outpost => ({
  id: 'out-1',
  coordinates: { x: 6, y: 7 },
  type: OutpostType.TEMPORARY,
  default_combat_strategy: CombatStrategy.BALANCED,
  plastic: 42,
  mushroom: 13,
  plasma: 0,
  earnings_per_second: { plastic: 0, mushroom: 0, plasma: 0 },
  pre_cell_earnings_per_second: { plastic: 0, mushroom: 0, plasma: 0 },
  cell_resource_coefficient: { plastic: 1, mushroom: 1 },
  technology_production_multiplier: { plastic: 1, mushroom: 1, plasma: 1 },
  faction_production_multiplier: { plastic: 1, mushroom: 1 },
  warehouses_capacity: { plastic: 2000, mushroom: 1500 },
  warehouse_full_in_seconds: { plastic: 0, mushroom: 0 },
  ...overrides,
})

const renderResources = (props: { city: City | null, outpost: Outpost | null }) => render(
  <ResourcePanelProvider>
    <HeaderResources {...props} />
    <p>workspace</p>
  </ResourcePanelProvider>
)

const chips = (container: HTMLElement) => Array.from(container.querySelectorAll('.header-resource-chip'))
  .map(chip => chip.getAttribute('data-resource'))

const resourceButton = () => screen.getByRole('button', { name: 'Ressources — afficher le détail' })

describe('HeaderResources', () => {
  it('renders nothing without city or outpost', () => {
    const { container } = renderResources({ city: null, outpost: null })
    expect(container.querySelector('button')).toBeNull()
  })

  it('shows five chips for a city, water and energy included, and no progress bar in the bar', () => {
    const { container } = renderResources({ city: minimalCity(), outpost: null })

    expect(chips(container)).toEqual([ 'Plastique', 'Champignon', 'Plasma', 'Eau pure', 'Énergie' ])
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('shows three chips for an outpost, without water or energy', () => {
    const { container } = renderResources({ city: null, outpost: minimalOutpost() })

    expect(chips(container)).toEqual([ 'Plastique', 'Champignon', 'Plasma' ])
    expect(container.querySelector('.game-icon--water')).toBeNull()
  })

  it('prefers the city over the outpost', () => {
    const { container } = renderResources({ city: minimalCity(), outpost: minimalOutpost() })
    expect(chips(container)).toHaveLength(5)
  })

  it('shows « 0 » for an empty stock', () => {
    const { container } = renderResources({ city: minimalCity({ plasma: 0 }), outpost: null })
    const plasma = container.querySelector('[data-resource="Plasma"] .font-mono')
    expect(plasma).toHaveTextContent(/^0$/)
  })

  it('warns from 90 % of a warehouse and turns danger at 100 %', () => {
    const { container } = renderResources({ city: minimalCity({ plastic: 900, mushroom: 1000 }), outpost: null })

    expect(container.querySelector('[data-resource="Plastique"] [data-warning]')).toHaveAttribute('data-warning', 'near')
    expect(container.querySelector('[data-resource="Champignon"] [data-warning]')).toHaveAttribute('data-warning', 'full')
    expect(container.querySelector('[data-resource="Champignon"] .font-mono')?.className).toContain('text-danger')
  })

  it('toggles the panel with the button (aria-expanded, aria-controls)', () => {
    renderResources({ city: minimalCity(), outpost: null })
    const button = resourceButton()

    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveAttribute('aria-controls', 'resource-panel')
    expect(screen.queryByRole('region', { name: 'Ressources' })).not.toBeInTheDocument()

    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('region', { name: 'Ressources' })).toHaveAttribute('id', 'resource-panel')

    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes on Escape and returns the focus to the button', () => {
    renderResources({ city: minimalCity(), outpost: null })
    fireEvent.click(resourceButton())

    const close = screen.getByRole('button', { name: 'Fermer' })
    close.focus()
    fireEvent.keyDown(close, { key: 'Escape' })

    expect(screen.queryByRole('region', { name: 'Ressources' })).not.toBeInTheDocument()
    expect(resourceButton()).toHaveFocus()
  })

  it('closes with « Fermer » and returns the focus to the button', () => {
    renderResources({ city: minimalCity(), outpost: null })
    fireEvent.click(resourceButton())

    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))

    expect(screen.queryByRole('region', { name: 'Ressources' })).not.toBeInTheDocument()
    expect(resourceButton()).toHaveFocus()
  })

  it('closes on a click outside the panel and the button', () => {
    renderResources({ city: minimalCity(), outpost: null })
    fireEvent.click(resourceButton())

    fireEvent.mouseDown(screen.getByRole('region', { name: 'Ressources' }))
    expect(screen.getByRole('region', { name: 'Ressources' })).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByText('workspace'))
    expect(screen.queryByRole('region', { name: 'Ressources' })).not.toBeInTheDocument()
  })

  it('closes on a route change', () => {
    pathname = '/city/city-1/base/'
    const { rerender } = renderResources({ city: minimalCity(), outpost: null })
    fireEvent.click(resourceButton())

    pathname = '/city/city-1/base/building'
    act(() => {
      rerender(
        <ResourcePanelProvider>
          <HeaderResources city={minimalCity()} outpost={null} />
        </ResourcePanelProvider>
      )
    })

    expect(screen.queryByRole('region', { name: 'Ressources' })).not.toBeInTheDocument()
  })
})

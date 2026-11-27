import React from 'react'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { City, Outpost } from '#types'
import { CombatStrategy, OutpostType } from '@eoneom/api-client'

import { HeaderResourcePanel } from './panel'

const city = (overrides: Partial<City> = {}): City => ({
  id: 'city-1',
  name: 'Testville',
  default_combat_strategy: CombatStrategy.BALANCED,
  plastic: 900,
  mushroom: 200,
  plasma: 50,
  water: 30,
  maximum_building_levels: 5,
  building_levels_used: 1,
  coordinates: { x: 2, y: 3 },
  earnings_per_second: { plastic: 1, mushroom: 0.5, plasma: 0.1, water: 0.05 },
  pre_cell_earnings_per_second: { plastic: 1, mushroom: 0.5, plasma: 0.1, water: 0.05 },
  cell_resource_coefficient: { plastic: 1.2, mushroom: 0.9 },
  technology_production_multiplier: { plastic: 1.15, mushroom: 1, plasma: 1, water: 1 },
  faction_production_multiplier: { plastic: 1, mushroom: 1.1 },
  warehouses_capacity: { plastic: 1000, mushroom: 1000 },
  warehouse_space_remaining: { plastic: 100, mushroom: 800 },
  warehouse_full_in_seconds: { plastic: 100, mushroom: 1600 },
  energy: 10,
  pre_cell_energy: 10,
  neutral_photovoltaic_energy: 10,
  cell_solar_coefficient: 1,
  photovoltaic_optimization_level: 0,
  energy_consumption: 8,
  production_energy_ratio: 1,
  ...overrides,
})

const outpost = (overrides: Partial<Outpost> = {}): Outpost => ({
  id: 'out-1',
  coordinates: { x: 6, y: 7 },
  type: OutpostType.PERMANENT,
  default_combat_strategy: CombatStrategy.BALANCED,
  plastic: 2000,
  mushroom: 13,
  plasma: 0,
  earnings_per_second: { plastic: 0.2, mushroom: 0.2, plasma: 0 },
  pre_cell_earnings_per_second: { plastic: 0.2, mushroom: 0.2, plasma: 0 },
  cell_resource_coefficient: { plastic: 1, mushroom: 1 },
  technology_production_multiplier: { plastic: 1, mushroom: 1, plasma: 1 },
  faction_production_multiplier: { plastic: 1, mushroom: 1 },
  warehouses_capacity: { plastic: 2000, mushroom: 1500 },
  warehouse_full_in_seconds: { plastic: 0, mushroom: 500 },
  ...overrides,
})

const tableBySection = (title: string) => {
  const section = screen.getByRole('heading', { name: title }).closest('section') as HTMLElement
  return within(section)
}

const row = (scope: ReturnType<typeof within>, name: string) => scope.getByRole('rowheader', { name }).closest('tr') as HTMLElement

describe('HeaderResourcePanel', () => {
  it('lists stock, capacity, fill, time to full and hourly production for a city', () => {
    render(<HeaderResourcePanel city={city()} outpost={null} onClose={vi.fn()} />)
    const stocks = tableBySection('Stocks et entrepôts')

    expect(stocks.getAllByRole('row')).toHaveLength(5)
    const plastic = within(row(stocks, 'Plastique'))
    expect(plastic.getByText('90 %')).toBeInTheDocument()
    expect(plastic.getByRole('progressbar', { name: 'Remplissage Plastique' })).toHaveAttribute('aria-valuenow', '90')
    expect(plastic.getByText('~1min 40s')).toBeInTheDocument()
    expect(plastic.getByText('~3.6k/h')).toBeInTheDocument()

    const plasma = within(row(stocks, 'Plasma'))
    expect(plasma.getByText('illimitée')).toBeInTheDocument()
    expect(within(row(stocks, 'Eau pure')).getByText('illimitée')).toBeInTheDocument()
  })

  it('shows « plein » for a full warehouse and « — » without production', () => {
    render(<HeaderResourcePanel city={city({ plastic: 1000, earnings_per_second: { plastic: 1, mushroom: 0, plasma: 0, water: 0 } })} outpost={null} onClose={vi.fn()} />)
    const stocks = tableBySection('Stocks et entrepôts')

    expect(within(row(stocks, 'Plastique')).getByText('plein')).toBeInTheDocument()
    expect(within(row(stocks, 'Champignon')).getAllByText('—').length).toBeGreaterThan(0)
  })

  it('breaks the production down: technology, faction, energy and water', () => {
    render(<HeaderResourcePanel city={city({ production_energy_ratio: 0.8 })} outpost={null} onClose={vi.fn()} />)
    const breakdown = tableBySection('Détail de la production (par heure)')

    const headers = breakdown.getAllByRole('columnheader').map(cell => cell.textContent)
    expect(headers).toEqual([ 'Ressource', 'Base', 'Terrain', 'Faction', 'Techno', 'Énergie', 'Actuelle' ])

    const plastic = within(row(breakdown, 'Plastique')).getAllByRole('cell').map(cell => cell.textContent)
    expect(plastic).toEqual([ '3.6k', '×1.2', '—', '+15 %', '80 %', '3.6k' ])

    const mushroom = within(row(breakdown, 'Champignon')).getAllByRole('cell').map(cell => cell.textContent)
    expect(mushroom[2]).toBe('+10 %')

    const water = within(row(breakdown, 'Eau pure')).getAllByRole('cell').map(cell => cell.textContent)
    expect(water[1]).toBe('×1')
    expect(water[2]).toBe('—')
    expect(water[3]).toBe('—')

    expect(breakdown.getByText('Production réduite à 80 % par manque d\'énergie.')).toBeInTheDocument()
  })

  it('shows no energy warning at full energy and the energy readout for a city', () => {
    render(<HeaderResourcePanel city={city()} outpost={null} onClose={vi.fn()} />)

    expect(screen.queryByText(/Production réduite/)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Énergie' })).toBeInTheDocument()
  })

  it('shows a permanent outpost without water, energy column or energy section', () => {
    render(<HeaderResourcePanel city={null} outpost={outpost()} onClose={vi.fn()} />)

    const stocks = tableBySection('Stocks et entrepôts')
    expect(stocks.queryByRole('rowheader', { name: 'Eau pure' })).not.toBeInTheDocument()

    const breakdown = tableBySection('Détail de la production (par heure)')
    expect(breakdown.getAllByRole('columnheader').map(cell => cell.textContent)).not.toContain('Énergie')
    expect(breakdown.getAllByRole('row')).toHaveLength(4)
    expect(screen.queryByRole('heading', { name: 'Énergie' })).not.toBeInTheDocument()
  })

  it('shows only the stocks of a temporary outpost, with the no-production note', () => {
    render(<HeaderResourcePanel city={null} outpost={outpost({ type: OutpostType.TEMPORARY })} onClose={vi.fn()} />)

    const stocks = tableBySection('Stocks et entrepôts')
    const plastic = within(row(stocks, 'Plastique')).getAllByRole('cell').map(cell => cell.textContent)
    expect(plastic[plastic.length - 1]).toBe('—')
    expect(screen.getByText('Avant-poste temporaire : aucune production. Rendez-le permanent pour produire.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Détail de la production (par heure)' })).not.toBeInTheDocument()
  })
})

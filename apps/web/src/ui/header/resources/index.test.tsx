import React from 'react'
import { render, screen } from '@testing-library/react'

import type { City, Outpost } from '#types'
import { OutpostType } from '@eoneom/api-client'

import { HeaderResources } from './index'

const minimalCity = (overrides: Partial<City> = {}): City => ({
  id: 'city-1',
  name: 'Testville',
  plastic: 10,
  mushroom: 20,
  plasma: 0,
  maximum_building_levels: 5,
  building_levels_used: 1,
  coordinates: { sector: 1, x: 2, y: 3 },
  earnings_per_second: { plastic: 0.1, mushroom: 0.2 , plasma: 0},
  pre_cell_earnings_per_second: { plastic: 0.1, mushroom: 0.2 , plasma: 0},
  cell_resource_coefficient: { plastic: 1, mushroom: 1 },
  warehouses_capacity: { plastic: 1000, mushroom: 1000 },
  warehouse_space_remaining: { plastic: 900, mushroom: 800 },
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
  coordinates: { sector: 5, x: 6, y: 7 },
  type: OutpostType.TEMPORARY,
  plastic: 42,
  mushroom: 13,
  plasma: 0,
  earnings_per_second: { plastic: 0, mushroom: 0 , plasma: 0},
  pre_cell_earnings_per_second: { plastic: 0, mushroom: 0 , plasma: 0},
  cell_resource_coefficient: { plastic: 1, mushroom: 1 },
  warehouses_capacity: { plastic: 2000, mushroom: 1500 },
  warehouse_full_in_seconds: { plastic: 0, mushroom: 0 },
  ...overrides,
})

describe('HeaderResources', () => {
  it('renders empty list without city or outpost', () => {
    render(<HeaderResources city={null} outpost={null} />)
    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })

  it('renders four resource rows when city is set (three with progress bars)', () => {
    render(<HeaderResources city={minimalCity()} outpost={null} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
    expect(screen.getAllByRole('progressbar')).toHaveLength(3)
  })

  it('renders three resource rows with two progress bars when outpost is set', () => {
    render(<HeaderResources city={null} outpost={minimalOutpost()} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getAllByRole('progressbar')).toHaveLength(2)
  })

  it('prefers city over outpost', () => {
    render(<HeaderResources city={minimalCity()} outpost={minimalOutpost()} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
    expect(screen.getAllByRole('progressbar')).toHaveLength(3)
  })
})

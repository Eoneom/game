import React from 'react'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { formatTechnologyBonus, ProductionBreakdownTable, type ProductionBreakdownRow } from './production-breakdown-table'

const rows: ProductionBreakdownRow[] = [
  { resource: 'plastic', base: 0.5, terrain: 1.2, faction: 0.9, technology: 1.15, current: 0.62 },
  { resource: 'water', base: 0.1, terrain: 1, current: 0.1 },
]

describe('ProductionBreakdownTable', () => {
  it('shows base, terrain, faction, techno, energy and current per hour', () => {
    render(<ProductionBreakdownTable rows={rows} energyRatio={1} />)

    const plastic = screen.getByRole('rowheader', { name: 'Plastique' }).closest('tr') as HTMLElement
    expect(within(plastic).getAllByRole('cell').map(cell => cell.textContent)).toEqual([
      '1.8k', '×1.2', '-10 %', '+15 %', '100 %', '2.23k',
    ])
    const water = screen.getByRole('rowheader', { name: 'Eau pure' }).closest('tr') as HTMLElement
    expect(within(water).getAllByRole('cell').map(cell => cell.textContent)).toEqual([
      '360', '×1', '—', '—', '100 %', '360',
    ])
    expect(screen.getByText(/Actuelle = base × terrain × faction × techno × énergie/)).toBeInTheDocument()
    expect(screen.queryByText(/Production réduite/)).not.toBeInTheDocument()
  })

  it('flags an energy shortage', () => {
    render(<ProductionBreakdownTable rows={rows} energyRatio={0.8} />)

    expect(screen.getAllByText('80 %')[0]).toHaveClass('text-danger')
    expect(screen.getByText('Production réduite à 80 % par manque d\'énergie.')).toHaveClass('text-danger')
  })

  it('drops the energy column without a ratio (outposts)', () => {
    render(<ProductionBreakdownTable rows={rows} />)

    expect(screen.queryByRole('columnheader', { name: 'Énergie' })).not.toBeInTheDocument()
  })
})

describe('formatTechnologyBonus', () => {
  it('formats a multiplier as a percent bonus', () => {
    expect(formatTechnologyBonus(1.05)).toBe('+5 %')
    expect(formatTechnologyBonus(1.2)).toBe('+20 %')
    expect(formatTechnologyBonus(0.9)).toBe('-10 %')
    expect(formatTechnologyBonus(1)).toBe('—')
  })
})

import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CatalogueCard, CatalogueCardProps } from '#ui/catalogue/card'

const props = (overrides: Partial<CatalogueCardProps> = {}): CatalogueCardProps => ({
  code: 'command_center',
  name: 'Centre de commandement',
  image: '/buildings/research_lab.png',
  amount: { kind: 'level', value: 4 },
  cost: { target_label: '▸ niv. 5', plastic: 12480, mushroom: 9300, plasma: 0, duration: 840 },
  stock: { plastic: 20000, mushroom: 5000, plasma: 0, water: 0 },
  state: { kind: 'available', catalogue: 'building' },
  selected: false,
  onSelect: () => undefined,
  ...overrides,
})

describe('CatalogueCard (043)', () => {
  it('renders a level, the cost row and the badge', () => {
    const { container } = render(<CatalogueCard {...props()} />)

    expect(screen.getByRole('option', { name: 'Centre de commandement' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByText('Niv. 4')).toBeInTheDocument()
    expect(screen.getByText('▸ niv. 5')).toBeInTheDocument()
    expect(screen.getByText('12.48k')).toBeInTheDocument()
    expect(screen.getByText('14 min')).toBeInTheDocument()
    expect(screen.getByText('Améliorable')).toBeInTheDocument()
    expect(screen.queryByText('Plasma')).not.toBeInTheDocument()
    expect(screen.queryByText('Eau')).not.toBeInTheDocument()
    expect(container.querySelector('img')).toHaveAttribute('loading', 'lazy')
  })

  it('renders a count for troops and defenses', () => {
    render(<CatalogueCard {...props({ amount: { kind: 'count', value: 12 }, extra: <p>dont 3 réservés</p> })} />)
    expect(screen.getByText('× 12')).toBeInTheDocument()
    expect(screen.getByText('dont 3 réservés')).toBeInTheDocument()
  })

  it('shows plasma and water chips only when they cost something and reds the chips the city cannot pay', () => {
    render(<CatalogueCard {...props({
      cost: { target_label: '▸ × 1', plastic: 100, mushroom: 6000, plasma: 20, water: 5, duration: 30 },
    })} />)

    expect(screen.getByText('Plasma').parentElement).toHaveAttribute('data-short', 'true')
    expect(screen.getByText('Eau').parentElement).toHaveAttribute('data-short', 'true')
    expect(screen.getByText('Champignon').parentElement).toHaveClass('text-danger')
    expect(screen.getByText('Plastique').parentElement).toHaveClass('text-ink')
    expect(screen.getByText('Plastique').parentElement).toHaveAttribute('title', 'Plastique : 100')
  })

  it('renders the badge copy of the state', () => {
    render(<CatalogueCard {...props({ state: { kind: 'insufficient_resources', warehouse_too_small: false, affordable_in_seconds: 720 } })} />)
    expect(screen.getByText(/Ressources insuffisantes/)).toHaveTextContent('Ressources insuffisantes · dans 12 min')
  })

  it('draws the progress bar of the entry in progress', () => {
    const { container } = render(<CatalogueCard {...props({
      state: { kind: 'in_progress', remaining_seconds: 60 },
      progress: { elapsed: 0.25 },
    })} />)
    expect(container.querySelector('.catalogue-card__progress')).toHaveStyle({ width: '25%' })
    expect(screen.getByText(/En cours/)).toHaveTextContent('En cours · 1 min')
  })

  it('marks the selected card and selects on click', async () => {
    const onSelect = vi.fn()
    render(<CatalogueCard {...props({ selected: true, onSelect })} />)
    const card = screen.getByRole('option', { name: 'Centre de commandement' })
    expect(card).toHaveAttribute('aria-selected', 'true')
    expect(card).toHaveClass('border-amber/60')
    await userEvent.click(card)
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('dims locked cards', () => {
    const { container } = render(<CatalogueCard {...props({
      state: { kind: 'missing_requirement', first: { name: 'Laboratoire de recherche', level: 3 }, more: 0 },
    })} />)
    expect(container.querySelector('img')).toHaveClass('opacity-60')
    expect(screen.getByRole('heading', { name: 'Centre de commandement' })).toHaveClass('text-amber-dim')
  })

  it('renders the read-only outpost variant without cost or badge', () => {
    const { container } = render(<CatalogueCard {...props({
      amount: { kind: 'count', value: 7 },
      cost: undefined,
      stock: undefined,
      state: { kind: 'none' },
    })} />)
    expect(screen.getByText('× 7')).toBeInTheDocument()
    expect(container.querySelector('.catalogue-card__cost')).toBeNull()
    expect(container.querySelector('.catalogue-badge')).toBeNull()
  })
})

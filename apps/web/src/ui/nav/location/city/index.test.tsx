import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { NavLocationCities } from './index'

const currentPath = vi.hoisted(() => ({ value: '/' }))

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
        (href, [key, value]) => href.replace(`$${key}`, value),
        to
      )}
      {...props}
    >
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: currentPath.value }),
}))

const cities = [
  { id: 'c1', name: 'Alpha', coordinates: { x: 1, y: 1 } },
  { id: 'c2', name: 'Beta', coordinates: { x: 2, y: 2 } },
]

describe('NavLocationCities', () => {
  it('renders Villes heading with current count and limit', () => {
    render(<NavLocationCities cities={cities} countLimit={5} />)

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Villes 2/5')
  })

  it('renders a link for each city', () => {
    render(<NavLocationCities cities={cities} countLimit={5} />)

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveTextContent('Alpha')
    expect(links[0]).toHaveAttribute('href', '/city/c1/base/')
    expect(links[1]).toHaveTextContent('Beta')
    expect(links[1]).toHaveAttribute('href', '/city/c2/base/')
  })

  it('shows an incoming-attack dot on targeted cities only', () => {
    const { container } = render(<NavLocationCities cities={cities} countLimit={5} threatenedIds={new Set([ 'c2' ])} />)

    const [ alpha, beta ] = screen.getAllByRole('link')
    expect(alpha.querySelector('[data-threat]')).toBeNull()
    const dot = beta.querySelector('[data-threat]')
    expect(dot).toHaveAttribute('title', 'Attaque entrante')
    expect(dot).toHaveTextContent('attaque entrante')
    expect(container.querySelectorAll('[data-threat]')).toHaveLength(1)
  })

  it('marks the current city with aria-current', () => {
    currentPath.value = '/city/c2/base/building'
    render(<NavLocationCities cities={cities} countLimit={5} />)

    const [ alpha, beta ] = screen.getAllByRole('link')
    expect(alpha).not.toHaveAttribute('aria-current')
    expect(beta).toHaveAttribute('aria-current', 'page')
    expect(beta).toHaveClass('bg-chrome-3', 'border-amber')
    expect(beta.className).not.toContain('neon-amber')
    currentPath.value = '/'
  })
})

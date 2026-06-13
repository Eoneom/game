import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

import { NavLocationCities } from './index'

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
  useLocation: () => ({ pathname: '/' }),
}))

const cities = [
  { id: 'c1', name: 'Alpha' },
  { id: 'c2', name: 'Beta' },
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
})

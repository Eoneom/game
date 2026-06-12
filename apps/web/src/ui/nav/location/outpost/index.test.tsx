import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { OutpostType } from '@eoneom/api-client'

import { NavLocationOutposts } from './index'

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
  useLocation: () => ({ pathname: '/' }) }))

const outposts = [
  {
    id: 'o1',
    coordinates: { x: 1, y: 2 },
    type: OutpostType.PERMANENT,
    plastic: 0,
    mushroom: 0 },
  {
    id: 'o2',
    coordinates: { x: 3, y: 4 },
    type: OutpostType.TEMPORARY,
    plastic: 0,
    mushroom: 0 } ]

describe('NavLocationOutposts', () => {
  it('renders Avant-postes heading with current count and limit', () => {
    render(<NavLocationOutposts outposts={outposts} countLimit={15} />)

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Avant-postes 2/15')
  })
})

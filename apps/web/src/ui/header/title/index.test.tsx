import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

import { HeaderTitle } from './index'

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

describe('HeaderTitle', () => {
  it('renders city link with text and href from props', () => {
    render(<HeaderTitle cityId='abc' text='My City' />)
    const link = screen.getByRole('link', { name: 'My City' })
    expect(link).toHaveAttribute('href', '/city/abc/base/')
  })

  it('renders outpost link when city is not set', () => {
    render(<HeaderTitle outpostId='x' text='' />)
    const link = screen.getByRole('link')
    expect(link).toHaveTextContent('')
    expect(link).toHaveAttribute('href', '/outpost/x')
  })
})

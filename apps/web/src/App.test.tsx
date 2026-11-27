import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  Outlet: () => <p>page</p>,
  useRouterState: ({ select }: { select: (state: { location: { pathname: string } }) => unknown }) => select({ location: { pathname: '/city/c1/base/' } }),
}))
vi.mock('react-toastify', () => ({ ToastContainer: () => null }))
vi.mock('#auth/unauthenticated', () => ({ AuthUnauthenticated: () => <p>login</p> }))
vi.mock('#auth/context', () => ({ useAuth: () => ({ token: 'token' }) }))
vi.mock('#auth/hooks', () => ({ useInitStoredToken: () => undefined, useClearInvalidSession: () => undefined }))
vi.mock('#auth/session', () => ({ isInvalidSessionError: () => false }))
vi.mock('#city/hooks', () => ({ useListCities: () => ({ data: { cities: [ { id: 'c1', name: 'Alpha' } ] }, error: null, isPending: false }) }))
vi.mock('#ui/header', () => ({ Header: () => <header>header</header> }))
vi.mock('#ui/nav/menu', () => ({ NavMenu: () => <nav aria-label="Navigation principale">menu</nav> }))
vi.mock('#ui/nav/location', () => ({ NavLocation: () => <aside aria-label="Emplacements">locations</aside> }))
vi.mock('#communication/chat/panel', () => ({ ChatPanel: () => <section aria-label="Discussion">chat</section> }))
vi.mock('#ui/fx', () => ({ FxLayer: () => null }))

import App from './App'

describe('App shell', () => {
  it('renders the skip link first, then the landmarks, without an activity strip', () => {
    const { container } = render(<App />)

    const skip = screen.getByRole('link', { name: 'Aller au contenu' })
    expect(skip).toHaveAttribute('href', '#workspace')
    expect(container.querySelector('a, button')).toBe(skip)

    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Navigation principale' })).toBeInTheDocument()
    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'workspace')
    expect(main).toHaveAttribute('tabindex', '-1')
    expect(main).toHaveTextContent('page')
    expect(screen.getByRole('complementary', { name: 'Emplacements' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Discussion' })).toBeInTheDocument()
    expect(container.querySelector('.activity-strip')).toBeNull()
    expect(screen.queryByText('Activité')).not.toBeInTheDocument()
  })

  it('moves the focus to the workspace from the skip link', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Aller au contenu' }))

    expect(screen.getByRole('main')).toHaveFocus()
  })
})

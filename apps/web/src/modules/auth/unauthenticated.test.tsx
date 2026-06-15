import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { AuthProvider } from '#auth/context'

import { AuthUnauthenticated } from './unauthenticated'

const renderUnauthenticated = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthUnauthenticated />
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe('AuthUnauthenticated', () => {
  it('starts on login and switches to signup', async () => {
    const user = userEvent.setup()
    renderUnauthenticated()

    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Créer un compte' }))

    expect(screen.getByRole('button', { name: 'S\'inscrire' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ville')).toBeInTheDocument()
  })
})

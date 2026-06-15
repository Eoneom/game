import React from 'react'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { AuthProvider } from '#auth/context'

import { AuthLoginForm } from './login-form'

const renderLoginForm = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe('AuthLoginForm', () => {
  it('renders name field, submit, and signup link', () => {
    renderLoginForm(<AuthLoginForm onGoToSignup={() => undefined} />)

    expect(screen.getByPlaceholderText('Nom')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Créer un compte' })).toBeInTheDocument()
  })
})

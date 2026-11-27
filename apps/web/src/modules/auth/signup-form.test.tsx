import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { AuthProvider } from '#auth/context'

import { AuthSignupForm } from './signup-form'

const renderSignupForm = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe('AuthSignupForm', () => {
  it('renders name, city, faction, and submit', () => {
    renderSignupForm(<AuthSignupForm onGoToLogin={() => undefined} />)

    expect(screen.getByPlaceholderText('Nom')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ville')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'La confédération' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'La Symbiose' })).not.toBeChecked()
    expect(screen.getByText('Armées nombreuses, +10 % champignons, −10 % plastique')).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Singularité technologique' })).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Liturgie des cendres' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'S\'inscrire' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Déjà un commandant ? Se connecter' })).toBeInTheDocument()
  })
})

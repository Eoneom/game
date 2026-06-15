import React, { useState } from 'react'

import { AuthLoginForm } from '#auth/login-form'
import { AuthScreen } from '#auth/screen'
import { AuthSignupForm } from '#auth/signup-form'

export const AuthUnauthenticated: React.FC = () => {
  const [view, setView] = useState<'login' | 'signup'>('login')

  return (
    <AuthScreen>
      {view === 'login'
        ? <AuthLoginForm onGoToSignup={() => setView('signup')} />
        : <AuthSignupForm onGoToLogin={() => setView('login')} />}
    </AuthScreen>
  )
}

import React, { createContext, useContext, useEffect, useState } from 'react'

import { SESSION_CLEARED_EVENT } from '#auth/session'

interface AuthContextValue {
  token: string | null
  setToken: (token: string) => void
  clearToken: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface Props {
  children: React.ReactNode
}

export const AuthProvider: React.FC<Props> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(() => {
    return window.localStorage.getItem('token')
  })

  const setToken = (newToken: string) => {
    window.localStorage.setItem('token', newToken)
    setTokenState(newToken)
  }

  const clearToken = () => {
    window.localStorage.removeItem('token')
    setTokenState(null)
  }

  useEffect(() => {
    const onSessionCleared = () => setTokenState(null)
    window.addEventListener(SESSION_CLEARED_EVENT, onSessionCleared)
    return () => window.removeEventListener(SESSION_CLEARED_EVENT, onSessionCleared)
  }, [])

  return (
    <AuthContext.Provider value={{ token, setToken, clearToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return ctx
}

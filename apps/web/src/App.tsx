import React from 'react'
import { Outlet } from '@tanstack/react-router'
import { ToastContainer } from 'react-toastify'

import { AuthLoginForm } from '#auth/login-form'
import { Header } from '#ui/header'
import { NavMenu } from '#ui/nav/menu'
import { NavLocation } from '#ui/nav/location'
import { ActivityStrip } from '#ui/activity'
import { FxLayer } from '#ui/fx'
import { useAuth } from '#auth/context'
import { useInitStoredToken } from '#auth/hooks'
import { useListCities } from '#city/hooks'

const App: React.FC = () => {
  useInitStoredToken()

  const { token } = useAuth()
  const { data: citiesData } = useListCities()

  if (!token) {
    return <AuthLoginForm />
  }

  if (!citiesData?.cities.length) {
    return (
      <div className="flex min-h-screen items-center justify-center text-amber">
        Chargement du terminal…
      </div>
    )
  }

  return (
    <div className="app-shell relative flex h-full flex-col overflow-hidden animate-boot-sweep motion-reduce:animate-none">
      <Header />
      <ActivityStrip />
      <div className="app-body relative z-10 flex min-h-0 flex-1 overflow-hidden">
        <NavMenu />
        <main className="workspace relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden surface-inset scanlines p-3">
          <Outlet />
        </main>
        <NavLocation />
      </div>
      <FxLayer />
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        theme="dark"
      />
    </div>
  )
}

export default App

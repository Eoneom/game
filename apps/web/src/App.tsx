import React from 'react'
import { Outlet, useRouterState } from '@tanstack/react-router'
import { ToastContainer } from 'react-toastify'

import { AuthUnauthenticated } from '#auth/unauthenticated'
import { Header } from '#ui/header'
import { NavMenu } from '#ui/nav/menu'
import { NavLocation } from '#ui/nav/location'
import { ResourcePanelProvider } from '#ui/header/resources/context'
import { FxLayer } from '#ui/fx'
import { ChatPanel } from '#communication/chat/panel'
import { useAuth } from '#auth/context'
import { useClearInvalidSession, useInitStoredToken } from '#auth/hooks'
import { isInvalidSessionError } from '#auth/session'
import { useListCities } from '#city/hooks'
import { useRestoreLocation } from '#location/restore'

/** Skip link target: move focus without touching the router's URL. */
const focusWorkspace = (event: React.MouseEvent<HTMLAnchorElement>) => {
  event.preventDefault()
  document.getElementById('workspace')?.focus()
}

const App: React.FC = () => {
  useInitStoredToken()
  useRestoreLocation()

  const is_admin_route = useRouterState({
    select: state => state.location.pathname.startsWith('/admin'),
  })
  const { token } = useAuth()
  const { data: citiesData, error, isPending } = useListCities()
  useClearInvalidSession(error)

  const sessionInvalid = error != null && isInvalidSessionError(error.message)

  let content: React.ReactNode

  if (!token || sessionInvalid) {
    content = <AuthUnauthenticated />
  } else if (is_admin_route) {
    content = <Outlet />
  } else if (isPending) {
    content = (
      <div className="flex min-h-screen items-center justify-center text-amber">
        Chargement du terminal…
      </div>
    )
  } else if (!citiesData?.cities.length) {
    content = (
      <div className="flex min-h-screen items-center justify-center text-amber">
        Chargement du terminal…
      </div>
    )
  } else {
    // Shell (slice 041): skip link, header, left navigation, workspace, locations, chat.
    content = (
      <ResourcePanelProvider>
        <a className="skip-link" href="#workspace" onClick={focusWorkspace}>Aller au contenu</a>
        <div className="app-shell relative flex h-full flex-col overflow-hidden animate-boot-sweep motion-reduce:animate-none">
          <Header />
          <div className="app-body relative z-10 flex min-h-0 flex-1 overflow-hidden">
            <NavMenu />
            <main
              id="workspace"
              tabIndex={-1}
              className="workspace relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto border border-rust/55 bg-chrome p-6"
            >
              <Outlet />
            </main>
            <NavLocation />
          </div>
          <ChatPanel />
          <FxLayer />
        </div>
      </ResourcePanelProvider>
    )
  }

  return (
    <>
      {content}
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        theme="dark"
      />
    </>
  )
}

export default App

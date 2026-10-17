import React from 'react'
import { Link } from '@tanstack/react-router'

import { useLogout } from '#auth/hooks'

export const AdminShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { mutate: logout } = useLogout()

  const RouterLink = Link as React.ComponentType<{
    to: string
    className?: string
    children: React.ReactNode
  }>

  return (
    <div className="app-shell relative flex h-full min-h-screen flex-col overflow-hidden bg-void text-amber">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-rust/70 bg-chrome px-4 py-3">
        <div className="min-w-0">
          <h1 className="m-0 text-base font-normal tracking-wide text-amber">
            Console opérateur
          </h1>
          <p className="m-0 text-xs text-amber-dim">
            Observabilité des joueurs système — hors interface de jeu
          </p>
        </div>
        <nav className="flex shrink-0 items-center gap-2">
          <RouterLink
            to="/inbox/report"
            className="rounded-sm border border-rust/50 px-2 py-1 text-sm text-amber-dim transition hover:border-amber/40 hover:text-amber"
          >
            Retour au jeu
          </RouterLink>
          <button
            type="button"
            className="rounded-sm border border-rust/50 px-2 py-1 text-sm text-amber-dim transition hover:border-danger hover:text-amber"
            onClick={() => logout()}
          >
            Se déconnecter
          </button>
        </nav>
      </header>
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
        {children}
      </main>
    </div>
  )
}

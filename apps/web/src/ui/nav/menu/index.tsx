import React from 'react'
import { Link, useLocation as useRouterLocation } from '@tanstack/react-router'
import classNames from 'classnames'

import { useLocation } from '#location/context'
import { useLogout } from '#auth/hooks'
import { useCountUnreadReports } from '#communication/report/hooks'

export const NavMenu: React.FC = () => {
  const { mutate: logout } = useLogout()
  const { cityId, outpostId } = useLocation()
  const { pathname } = useRouterLocation()
  const { data: unreadCount } = useCountUnreadReports()

  const RouterLink = Link as React.ComponentType<{
    to: string
    params?: Record<string, string>
    className?: string
    children: React.ReactNode
  }>

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  const linkClass = (href: string) =>
    classNames(
      'block rounded-sm border border-transparent px-2 py-1.5 text-sm transition-colors',
      isActive(href)
        ? 'neon-amber motion-safe-neon border-amber/50 bg-chrome text-amber'
        : 'text-amber-dim hover:border-rust/60 hover:bg-chrome/60 hover:text-amber'
    )

  return (
    <nav className="primary-nav surface-chrome flex w-44 shrink-0 flex-col overflow-y-auto border-r border-rust/70 p-3">
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {cityId ? (
          <li>
            <RouterLink
              to="/city/$cityId/base/"
              params={{ cityId }}
              className={classNames(
                'block rounded-sm border border-transparent px-2 py-1.5 text-sm transition-colors',
                pathname === `/city/${cityId}/base` || pathname === `/city/${cityId}/base/`
                  ? 'border-amber/60 bg-chrome text-amber'
                  : 'text-amber-dim hover:border-rust/60 hover:bg-chrome/60 hover:text-amber'
              )}
            >
              Colonie
            </RouterLink>
          </li>
        ) : null}
        <li>
          {cityId ? (
            <RouterLink
              to="/city/$cityId/world/map"
              params={{ cityId }}
              className={linkClass(`/city/${cityId}/world/map`)}
            >
              Carte
            </RouterLink>
          ) : outpostId ? (
            <RouterLink
              to="/outpost/$outpostId/world/map"
              params={{ outpostId }}
              className={linkClass(`/outpost/${outpostId}/world/map`)}
            >
              Carte
            </RouterLink>
          ) : null}
        </li>
        <li>
          <RouterLink
            to="/inbox/report"
            className={linkClass('/inbox/report')}
          >
            Rapport ({unreadCount ?? 0})
          </RouterLink>
        </li>
      </ul>

      <button
        type="button"
        className="mt-auto w-full rounded-sm border border-rust/50 bg-chrome px-2 py-1.5 text-left text-sm text-amber-dim transition hover:border-danger hover:text-amber"
        onClick={e => {
          e.preventDefault()
          logout()
        }}
      >
        Se déconnecter
      </button>
    </nav>
  )
}

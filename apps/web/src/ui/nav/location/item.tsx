import React from 'react'
import classNames from 'classnames'
import { Link, useLocation } from '@tanstack/react-router'

type Props = {
  text: string
  /** e.g. monospace for coordinate labels */
  linkClassName?: string
  /** An incoming attack targets this location (slice 041). */
  threatened?: boolean
} & (
  | { kind: 'city'; cityId: string }
  | { kind: 'outpost'; outpostId: string }
)

const RouterLink = Link as unknown as React.ComponentType<{
  to: string
  params?: Record<string, string>
  className?: string
  title?: string
  'aria-current'?: 'page'
  children: React.ReactNode
}>

/** One location row of the right column: 36 px, current state, incoming-attack dot. */
export const NavLocationItem: React.FC<Props> = (props) => {
  const { text, linkClassName, threatened = false } = props
  const { pathname } = useLocation()
  const href = props.kind === 'city' ? `/city/${props.cityId}` : `/outpost/${props.outpostId}`
  const isCurrent = pathname === href || pathname.startsWith(`${href}/`)

  const className = classNames(
    'flex items-center gap-2 rounded-sm border-l-2 px-2 py-1.5 text-body no-underline transition-colors hover:no-underline',
    isCurrent
      ? 'border-amber bg-chrome-3 text-amber'
      : 'border-transparent text-amber-dim hover:bg-chrome-3/60 hover:text-amber',
    linkClassName
  )

  const content = (
    <>
      <span className="min-w-0 flex-1 truncate">{text}</span>
      {threatened ? (
        <span className="h-2 w-2 shrink-0 rounded-full bg-danger" title="Attaque entrante" data-threat>
          <span className="sr-only">attaque entrante</span>
        </span>
      ) : null}
    </>
  )

  return (
    <li>
      {props.kind === 'city' ? (
        <RouterLink
          to="/city/$cityId/base/"
          params={{ cityId: props.cityId }}
          className={className}
          title={text}
          aria-current={isCurrent ? 'page' : undefined}
        >
          {content}
        </RouterLink>
      ) : (
        <RouterLink
          to="/outpost/$outpostId"
          params={{ outpostId: props.outpostId }}
          className={className}
          title={text}
          aria-current={isCurrent ? 'page' : undefined}
        >
          {content}
        </RouterLink>
      )}
    </li>
  )
}

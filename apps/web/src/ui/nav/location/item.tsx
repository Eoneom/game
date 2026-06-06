import React from 'react'
import classNames from 'classnames'
import { Link, useLocation } from '@tanstack/react-router'

import { getActiveClassName } from '#helpers/classname'
type Props = {
  text: string
  /** e.g. monospace for coordinate labels */
  linkClassName?: string
} & (
  | { kind: 'city'; cityId: string }
  | { kind: 'outpost'; outpostId: string }
)

export const NavLocationItem: React.FC<Props> = (props) => {
  const { text, linkClassName } = props
  const { pathname } = useLocation()
  const href =
    props.kind === 'city'
      ? `/city/${props.cityId}/base`
      : `/outpost/${props.outpostId}`
  const className = classNames(
    getActiveClassName({
      isActive:
        props.kind === 'city'
          ? pathname.startsWith(`/city/${props.cityId}`)
          : pathname === href || pathname.startsWith(`${href}/`),
    }),
    'block rounded-sm border border-transparent px-2 py-1 text-sm text-amber-dim transition hover:border-rust/50 hover:text-amber',
    linkClassName,
    (props.kind === 'city'
      ? pathname.startsWith(`/city/${props.cityId}`)
      : pathname === href || pathname.startsWith(`${href}/`)) &&
      'neon-amber motion-safe-neon border-amber/40 bg-chrome text-amber'
  )


  const RouterLink = Link as React.ComponentType<{
    to: string
    params?: Record<string, string>
    className?: string
    children: React.ReactNode
  }>

  return (
    <li>
      {props.kind === 'city' ? (
        <RouterLink to="/city/$cityId/base/" params={{ cityId: props.cityId }} className={className}>
          {text}
        </RouterLink>
      ) : (
        <RouterLink to="/outpost/$outpostId" params={{ outpostId: props.outpostId }} className={className}>
          {text}
        </RouterLink>
      )}
    </li>
  )
}

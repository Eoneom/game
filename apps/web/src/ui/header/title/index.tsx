import React from 'react'
import { Link } from '@tanstack/react-router'

interface Props {
  text: string
  cityId?: string
  outpostId?: string
}

export const HeaderTitle: React.FC<Props> = ({ text, cityId, outpostId }) => {
  const RouterLink = Link as React.ComponentType<{
    to: string
    params?: Record<string, string>
    children: React.ReactNode
  }>

  return (
    <h1>
      {cityId && (
        <RouterLink to="/city/$cityId/base/" params={{ cityId }}>{text}</RouterLink>
      )}
      {!cityId && outpostId && (
        <RouterLink to="/outpost/$outpostId" params={{ outpostId }}>{text}</RouterLink>
      )}
    </h1>
  )
}

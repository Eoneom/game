import React from 'react'
import { Link } from '@tanstack/react-router'
import { BuildingCode, TechnologyCode } from '@eoneom/api-client'

const RouterLink = Link as unknown as React.ComponentType<{
  to: string
  params: Record<string, string>
  search: Record<string, string>
  className?: string
  children: React.ReactNode
}>

type Props = {
  cityId: string
  children: React.ReactNode
} & (
  | { kind: 'building', code: BuildingCode }
  | { kind: 'technology', code: TechnologyCode }
)

/** Requirement name linking to the catalogue entry that unblocks it (`?code=`, slice 043). */
export const RequirementLink: React.FC<Props> = (props) => {
  const { cityId, children } = props
  const to = props.kind === 'technology'
    ? '/city/$cityId/base/technology'
    : props.code === BuildingCode.CITY_WALL
      ? '/city/$cityId/base/defense'
      : '/city/$cityId/base/building'

  return (
    <RouterLink
      to={to}
      params={{ cityId }}
      search={{ code: props.code }}
      className="text-inherit underline decoration-dotted underline-offset-2 hover:text-amber"
    >
      {children}
    </RouterLink>
  )
}

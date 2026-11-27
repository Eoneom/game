import React from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { MapPage } from '#map/page'

type MapSearch = {
  x?: number
  y?: number
}

const MapRoute: React.FC = () => {
  const { cityId } = Route.useParams()
  const { x, y } = Route.useSearch()
  const focus = x !== undefined && y !== undefined ? { x, y } : null
  return <MapPage key={focus ? `${focus.x}.${focus.y}` : 'home'} cityId={cityId} focus={focus} />
}

const optionalInteger = (value: unknown): number | undefined => {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number.parseInt(value, 10) : NaN
  return Number.isInteger(parsed) ? parsed : undefined
}

export const Route = createFileRoute('/city/$cityId/world/map')({
  validateSearch: (search: Record<string, unknown>): MapSearch => ({
    x: optionalInteger(search.x),
    y: optionalInteger(search.y),
  }),
  component: MapRoute,
})

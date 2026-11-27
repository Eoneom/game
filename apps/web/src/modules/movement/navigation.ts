import { useNavigate } from '@tanstack/react-router'

/** City or outpost the movements page and the send wizard act from (slice 045). */
export type MovementOrigin = { kind: 'city' | 'outpost'; id: string }

export const movementOriginOf = ({ cityId, outpostId }: { cityId?: string; outpostId?: string }): MovementOrigin =>
  cityId ? { kind: 'city', id: cityId } : { kind: 'outpost', id: outpostId ?? '' }

const locationPath = (origin: MovementOrigin): string => `/${origin.kind}/${origin.id}`

/** `/city/<id>/world/movement` or `/outpost/<id>/world/movement`. */
export const movementListPath = (origin: MovementOrigin): string => `${locationPath(origin)}/world/movement`

export const movementSendPath = (origin: MovementOrigin): string => `${movementListPath(origin)}/send`

export const worldMapPath = (origin: MovementOrigin): string => `${locationPath(origin)}/world/map`

type NavigateOptions = {
  to: string
  search?: Record<string, unknown>
  replace?: boolean
}

/** Router navigation by resolved path: the movement routes exist under both a city and an outpost. */
export const usePathNavigate = (): ((options: NavigateOptions) => void) => {
  const navigate = useNavigate() as unknown as (options: NavigateOptions) => void
  return navigate
}

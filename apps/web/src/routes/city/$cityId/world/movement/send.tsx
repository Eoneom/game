import React from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { MovementSendRoute } from '#movement/send/route'
import { validateMovementSendSearch } from '#movement/send/search'

const CityMovementSendRoute: React.FC = () => {
  const { cityId } = Route.useParams()
  return <MovementSendRoute origin={{ kind: 'city', id: cityId }} search={Route.useSearch()} />
}

/** Send wizard (slice 045): a static segment, matched before `$movementId`. */
export const Route = createFileRoute('/city/$cityId/world/movement/send')({
  validateSearch: validateMovementSendSearch,
  component: CityMovementSendRoute,
})

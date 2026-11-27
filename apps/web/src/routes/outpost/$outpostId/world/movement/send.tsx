import React from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { MovementSendRoute } from '#movement/send/route'
import { validateMovementSendSearch } from '#movement/send/search'

const OutpostMovementSendRoute: React.FC = () => {
  const { outpostId } = Route.useParams()
  return <MovementSendRoute origin={{ kind: 'outpost', id: outpostId }} search={Route.useSearch()} />
}

/** Send wizard (slice 045) from an outpost: a static segment, matched before `$movementId`. */
export const Route = createFileRoute('/outpost/$outpostId/world/movement/send')({
  validateSearch: validateMovementSendSearch,
  component: OutpostMovementSendRoute,
})

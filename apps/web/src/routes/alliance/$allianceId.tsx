import React from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { AlliancePublicView } from '#alliance/public-view'

const AlliancePublicRoute: React.FC = () => {
  const { allianceId } = Route.useParams()
  return <AlliancePublicView allianceId={allianceId} />
}

export const Route = createFileRoute('/alliance/$allianceId')({
  component: AlliancePublicRoute,
})

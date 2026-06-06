import React from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { TroopPage } from '#troop/page'

const TroopRoute: React.FC = () => {
  const { cityId } = Route.useParams()
  return <TroopPage cityId={cityId} />
}

export const Route = createFileRoute('/city/$cityId/base/troop')({
  component: TroopRoute,
})

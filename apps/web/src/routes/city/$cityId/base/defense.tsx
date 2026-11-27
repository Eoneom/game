import React from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { DefensePage } from '#defense/page'

const DefenseRoute: React.FC = () => {
  const { cityId } = Route.useParams()
  return <DefensePage cityId={cityId} />
}

export const Route = createFileRoute('/city/$cityId/base/defense')({
  component: DefenseRoute,
})

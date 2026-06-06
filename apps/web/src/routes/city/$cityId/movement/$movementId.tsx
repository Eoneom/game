import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/city/$cityId/movement/$movementId')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/city/$cityId/world/movement/$movementId',
      params: { cityId: params.cityId, movementId: params.movementId },
    })
  },
})

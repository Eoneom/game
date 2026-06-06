import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/outpost/$outpostId/movement/$movementId')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/outpost/$outpostId/world/movement/$movementId',
      params: { outpostId: params.outpostId, movementId: params.movementId },
    })
  },
})

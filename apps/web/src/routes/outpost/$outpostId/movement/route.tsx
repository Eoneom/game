import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/outpost/$outpostId/movement')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/outpost/$outpostId/world/movement',
      params: { outpostId: params.outpostId },
    })
  },
})

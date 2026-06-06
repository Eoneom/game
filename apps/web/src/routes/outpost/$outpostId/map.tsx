import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/outpost/$outpostId/map')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/outpost/$outpostId/world/map',
      params: { outpostId: params.outpostId },
    })
  },
})

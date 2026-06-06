import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/city/$cityId/movement')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/city/$cityId/world/movement',
      params: { cityId: params.cityId },
    })
  },
})

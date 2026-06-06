import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/city/$cityId/world/')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/city/$cityId/world/map',
      params: { cityId: params.cityId },
    })
  },
})

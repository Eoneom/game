import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/city/$cityId/troop')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/city/$cityId/base/troop',
      params: { cityId: params.cityId },
    })
  },
})

import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/city/$cityId/building')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/city/$cityId/base/building',
      params: { cityId: params.cityId },
    })
  },
})

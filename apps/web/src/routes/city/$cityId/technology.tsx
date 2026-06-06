import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/city/$cityId/technology')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/city/$cityId/base/technology',
      params: { cityId: params.cityId },
    })
  },
})

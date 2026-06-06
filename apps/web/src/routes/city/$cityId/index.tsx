import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/city/$cityId/')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/city/$cityId/base/',
      params: { cityId: params.cityId },
    })
  },
})

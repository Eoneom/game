import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/system-players')({
  beforeLoad: () => {
    throw redirect({ to: '/admin' })
  },
})

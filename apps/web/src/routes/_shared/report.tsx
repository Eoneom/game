import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_shared/report')({
  beforeLoad: () => {
    throw redirect({ to: '/inbox/report' })
  },
})

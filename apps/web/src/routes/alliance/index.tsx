import { createFileRoute } from '@tanstack/react-router'

import { AlliancePage } from '#alliance/page'

export const Route = createFileRoute('/alliance/')({
  component: AlliancePage,
})

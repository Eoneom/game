import React from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { ReportPage } from '#communication/page'

type InboxReportSearch = {
  report_id?: string
}

const InboxReportRoute: React.FC = () => {
  const { report_id } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <ReportPage
      selectedReportId={report_id ?? null}
      onReportSelect={(id) => navigate({ search: { report_id: id } })}
    />
  )
}

export const Route = createFileRoute('/inbox/report')({
  validateSearch: (search: Record<string, unknown>): InboxReportSearch => ({
    report_id: typeof search.report_id === 'string' ? search.report_id : undefined,
  }),
  component: InboxReportRoute,
})

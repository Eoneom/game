import React from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { ReportPage } from '#communication/page'

const InboxReportRoute: React.FC = () => {
  return <ReportPage />
}

export const Route = createFileRoute('/inbox/report')({
  component: InboxReportRoute,
})

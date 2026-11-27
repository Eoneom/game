import { LayoutPage } from '#ui/layout/page'
import React, { useState } from 'react'
import { ReportList, type ReportReadFilter } from '#communication/report/list'
import { ReportDetails } from '#communication/report/details'
import { InboxTabs } from '#communication/inbox-tabs'
import {
  useListReports,
  useGetReport,
  useCountUnreadReports,
  useMarkAllReportsAsRead,
} from '#communication/report/hooks'

export const ReportPage: React.FC<{
  selectedReportId: string | null
  onReportSelect: (reportId: string) => void
}> = ({ selectedReportId, onReportSelect }) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [wasReadFilter, setWasReadFilter] = useState<ReportReadFilter>(undefined)

  const { data: reportsData } = useListReports(currentPage, wasReadFilter)
  const { data: report } = useGetReport(selectedReportId)
  const { data: unreadCount = 0 } = useCountUnreadReports()
  const markAllAsRead = useMarkAllReportsAsRead()

  const reports = reportsData?.reports ?? []

  const handleFilterChange = (filter: ReportReadFilter) => {
    setWasReadFilter(filter)
    setCurrentPage(1)
  }

  return <LayoutPage details={report && <ReportDetails report={report}/>}>
    <InboxTabs active="report" />
    <ReportList
      reports={reports}
      currentPage={currentPage}
      total={reportsData?.total ?? 0}
      pageSize={reportsData?.page_size ?? 0}
      wasReadFilter={wasReadFilter}
      unreadCount={unreadCount}
      markAllPending={markAllAsRead.isPending}
      onPageChange={setCurrentPage}
      onFilterChange={handleFilterChange}
      onReportSelect={onReportSelect}
      onMarkAllAsRead={() => markAllAsRead.mutate()}
    />
  </LayoutPage>
}

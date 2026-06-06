import { formatCoordinates, formatDate } from '#helpers/transform'
import { Button } from '#ui/button'
import { ReportItem } from '#types'
import classNames from 'classnames'
import React from 'react'

export type ReportReadFilter = boolean | undefined

interface Props {
  reports: ReportItem[]
  currentPage: number
  total: number
  pageSize: number
  wasReadFilter: ReportReadFilter
  unreadCount: number
  markAllPending: boolean
  onPageChange: (page: number) => void
  onFilterChange: (filter: ReportReadFilter) => void
  onReportSelect: (reportId: string) => void
  onMarkAllAsRead: () => void
}

const FILTERS: { label: string; value: ReportReadFilter }[] = [
  { label: 'Tous', value: undefined },
  { label: 'Non lus', value: false },
  { label: 'Lus', value: true },
]

export const ReportList: React.FC<Props> = ({
  reports,
  currentPage,
  total,
  pageSize,
  wasReadFilter,
  unreadCount,
  markAllPending,
  onPageChange,
  onFilterChange,
  onReportSelect,
  onMarkAllAsRead,
}) => {
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0
  const canPrev = currentPage > 1
  const canNext = totalPages > 0 && currentPage < totalPages

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          {FILTERS.map(({ label, value }) => (
            <button
              key={label}
              type="button"
              className={classNames(
                'rounded-sm border px-2 py-1 text-xs uppercase tracking-wider transition',
                wasReadFilter === value
                  ? 'neon-amber motion-safe-neon border-amber/50 bg-chrome text-amber'
                  : 'border-rust/40 text-amber-dim hover:border-rust hover:text-amber'
              )}
              onClick={() => onFilterChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <Button disabled={markAllPending} onClick={onMarkAllAsRead} variant="ghost">
            Tout marquer comme lu
          </Button>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 text-xs text-amber-dim">
          <p className="m-0">
            Page {currentPage}/{totalPages}
          </p>
          <div className="flex gap-1">
            <Button disabled={!canPrev} onClick={() => onPageChange(currentPage - 1)} variant="ghost">
              Précédente
            </Button>
            <Button disabled={!canNext} onClick={() => onPageChange(currentPage + 1)} variant="ghost">
              Suivante
            </Button>
          </div>
        </div>
      )}
      <ul className="m-0 list-none space-y-2 p-0">
        {reports.map(report => (
          <li
            key={report.id}
            className={classNames(
              'cursor-pointer rounded-sm border p-2 transition hover:border-amber/50',
              report.was_read
                ? 'border-rust/30 bg-chrome/40 text-amber-dim'
                : 'neon-amber motion-safe-neon border-amber/40 bg-chrome text-amber'
            )}
            onClick={() => onReportSelect(report.id)}
          >
            <div className="flex justify-between gap-2 text-xs">
              <span className="uppercase tracking-wider text-label">{report.type}</span>
              <time dateTime={new Date(report.recorded_at).toISOString()}>
                {formatDate(report.recorded_at)}
              </time>
            </div>
            <div className="mt-1 flex items-center gap-2 font-mono text-sm">
              <span>{formatCoordinates(report.origin)}</span>
              <span aria-hidden>→</span>
              <span>{formatCoordinates(report.destination)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

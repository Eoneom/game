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
    <div className="report-list">
      <div className="report-list__actions">
        <div className="report-list__filters">
          {FILTERS.map(({ label, value }) => (
            <button
              key={label}
              type="button"
              className={classNames('report-list__filter', {
                'report-list__filter--active': wasReadFilter === value
              })}
              onClick={() => onFilterChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <Button
            disabled={markAllPending}
            onClick={onMarkAllAsRead}
          >
            Tout marquer comme lu
          </Button>
        )}
      </div>
      {totalPages > 1 && (
        <div className="report-list__pagination">
          <p className="report-list__page-label">
            Page {currentPage}/{totalPages}
          </p>
          <div className="report-list__pagination-actions">
            <Button
              disabled={!canPrev}
              onClick={() => onPageChange(currentPage - 1)}
            >
              Précédente
            </Button>
            <Button
              disabled={!canNext}
              onClick={() => onPageChange(currentPage + 1)}
            >
              Suivante
            </Button>
          </div>
        </div>
      )}
      <ul className="report-list__items">
        {reports.map(report => (
          <li
            key={report.id}
            className={classNames('report-list__item', {
              'report-list__item--unread': !report.was_read
            })}
            onClick={() => onReportSelect(report.id)}
          >
            <div className="report-list__meta">
              <span className="report-list__type">{report.type}</span>
              <time dateTime={new Date(report.recorded_at).toISOString()}>
                {formatDate(report.recorded_at)}
              </time>
            </div>
            <div className="report-list__route">
              <span className="report-list__coords" title="Origine">
                {formatCoordinates(report.origin)}
              </span>
              <span className="report-list__arrow" aria-hidden>
                →
              </span>
              <span className="report-list__coords" title="Destination">
                {formatCoordinates(report.destination)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

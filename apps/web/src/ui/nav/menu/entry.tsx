import React, { useId } from 'react'
import { Link } from '@tanstack/react-router'
import classNames from 'classnames'

const RouterLink = Link as unknown as React.ComponentType<{
  to: string
  params?: Record<string, string>
  className?: string
  'aria-current'?: 'page'
  'aria-labelledby'?: string
  'aria-describedby'?: string
  children: React.ReactNode
}>

interface Props {
  to: string
  params?: Record<string, string>
  label: string
  current: boolean
  /** Queue depth « +2 », movement cap « 3/7 » or an unread badge. */
  right?: React.ReactNode
  /** Activity line(s) shown under the label, inside the link (slice 041). */
  activity?: React.ReactNode
  /** Incoming attack on this location: danger left bar when the entry is not current. */
  threat?: boolean
}

/** One left-column entry (slice 041): link row, current state, right slot, optional activity line. */
export const NavEntry: React.FC<Props> = ({
  to,
  params,
  label,
  current,
  right,
  activity,
  threat = false,
}) => {
  const id = useId()
  const labelId = `${id}-label`
  const rightId = `${id}-right`
  const activityId = `${id}-activity`

  return (
    <li>
      <RouterLink
        to={to}
        params={params}
        aria-current={current ? 'page' : undefined}
        aria-labelledby={right !== undefined && right !== null ? `${labelId} ${rightId}` : labelId}
        aria-describedby={activity ? activityId : undefined}
        className={classNames(
          'nav-entry block rounded-sm border-l-2 px-2 py-1.5 text-body no-underline transition-colors hover:no-underline',
          current
            ? 'border-amber bg-chrome-3 text-amber'
            : classNames(
              'text-amber-dim hover:bg-chrome-3/60 hover:text-amber',
              threat ? 'border-danger' : 'border-transparent'
            )
        )}
      >
        <span className="flex items-center justify-between gap-2">
          <span id={labelId} className="min-w-0 truncate">{label}</span>
          {right !== undefined && right !== null ? (
            <span id={rightId} className="shrink-0">{right}</span>
          ) : null}
        </span>
        {activity ? (
          <span id={activityId} className="mt-0.5 block pl-2">
            {activity}
          </span>
        ) : null}
      </RouterLink>
    </li>
  )
}

/** Right-slot text: queue depth « +N » or movement cap « used/limit ». */
export const NavEntryCount: React.FC<{ children: React.ReactNode, danger?: boolean, srLabel?: string }> = ({
  children,
  danger = false,
  srLabel,
}) => (
  <span className={classNames('font-mono text-caption', danger ? 'text-danger' : 'text-label')}>
    {children}
    {srLabel ? <>{' '}<span className="sr-only">{srLabel}</span></> : null}
  </span>
)

/** Unread badge, hidden at 0 by the caller. */
export const NavEntryBadge: React.FC<{ count: number }> = ({ count }) => (
  <span className="rounded-sm bg-copper/30 px-1.5 py-0.5 font-mono text-caption text-amber">
    {count}{' '}
    <span className="sr-only">non lus</span>
  </span>
)

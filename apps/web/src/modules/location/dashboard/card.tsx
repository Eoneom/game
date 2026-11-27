import React, { useId } from 'react'
import classNames from 'classnames'
import { Link } from '@tanstack/react-router'

import { Button } from '#ui/button'

export type DashboardCardState = 'loading' | 'error' | 'ready'

/** 3 columns from a 1152 px workspace (container query on `main#workspace`), 2 below (slice 042). */
export const DASHBOARD_GRID_CLASS = 'grid grid-cols-2 gap-4 @[72rem]:grid-cols-3'

type RouterLinkProps = {
  to: string
  params?: Record<string, string>
  search?: Record<string, string>
  className?: string
  id?: string
  children: React.ReactNode
}

/** Typed loosely: the dashboards link to routes under a city and an outpost. */
export const DashboardLink = Link as unknown as React.ComponentType<RouterLinkProps>

/** Card state from a React Query result: cached data wins over a failed refetch. */
export const queryCardState = (...queries: { data?: unknown, isError: boolean }[]): DashboardCardState => {
  if (queries.some(query => query.isError && query.data === undefined)) return 'error'
  if (queries.some(query => query.data === undefined)) return 'loading'
  return 'ready'
}

interface Props {
  /** French title, rendered in an `h2`; links to the full page when `to` is given. */
  title: string
  to?: string
  params?: Record<string, string>
  search?: Record<string, string>
  tone?: 'default' | 'alert'
  state: DashboardCardState
  onRetry?: () => void
  /** Extra control in the title row (e.g. « Détail de la production »). */
  action?: React.ReactNode
  /** Grid span (`col-span-2`, `col-span-full`). */
  className?: string
  role?: 'status'
  children?: React.ReactNode
}

const SKELETON_WIDTHS = [ 'w-4/5', 'w-3/5', 'w-2/5' ]

/** Frame of every dashboard card (slice 042): linked title, loading skeleton, error with retry. */
export const DashboardCard: React.FC<Props> = ({
  title,
  to,
  params,
  search,
  tone = 'default',
  state,
  onRetry,
  action,
  className,
  role,
  children,
}) => {
  const titleId = useId()
  const alert = tone === 'alert'

  return (
    <section
      aria-labelledby={titleId}
      aria-busy={state === 'loading' ? true : undefined}
      role={role}
      className={classNames('surface-panel min-w-0 p-4', alert && 'border-danger', className)}
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id={titleId} className={classNames('m-0 text-heading', alert ? 'text-danger' : 'text-amber')}>
          {to ? (
            <DashboardLink to={to} params={params} search={search} className="text-inherit no-underline hover:underline">
              {title}
              <span aria-hidden> →</span>
            </DashboardLink>
          ) : title}
        </h2>
        {action && state === 'ready' ? <div className="shrink-0">{action}</div> : null}
      </div>

      {state === 'loading' ? (
        <div className="space-y-2" data-testid="dashboard-card-skeleton">
          {SKELETON_WIDTHS.map(width => (
            <div key={width} className={classNames('h-3 rounded-sm bg-chrome-3 animate-pulse motion-reduce:animate-none', width)} />
          ))}
        </div>
      ) : state === 'error' ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="m-0 text-meta text-amber-dim">Données indisponibles.</p>
          {onRetry ? <Button variant="ghost" onClick={onRetry}>Réessayer</Button> : null}
        </div>
      ) : children}
    </section>
  )
}

/** Empty state sentence with an optional call to action link. */
export const DashboardEmpty: React.FC<{
  children: React.ReactNode
  cta?: { label: string, to: string, params?: Record<string, string>, search?: Record<string, string> }
}> = ({ children, cta }) => (
  <p className="m-0 text-meta text-amber-dim">
    {children}
    {cta ? (
      <>
        {' '}
        <DashboardLink to={cta.to} params={cta.params} search={cta.search} className="text-amber">
          {cta.label}
        </DashboardLink>
      </>
    ) : null}
  </p>
)

import React from 'react'
import classNames from 'classnames'

import { useCountdownProgress } from '#hook/countdown-progress'
import { CountdownProgress } from '#ui/countdown-progress'
import { DashboardCard, DashboardCardState, DashboardEmpty } from '#location/dashboard/card'

const pad = (value: number): string => String(value).padStart(2, '0')

/** « 14:32 », prefixed with « 28/11 » when the job ends another day. */
const formatFinishClock = (timestamp: number, now: number = Date.now()): string => {
  const date = new Date(timestamp)
  const today = new Date(now)
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  const same_day = date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate()
  return same_day ? time : `${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${time}`
}

interface ActiveJob {
  /** « Usine de recyclage 4 → 5 », « 12 Éclaireurs ». */
  label: React.ReactNode
  startAt: number
  endAt: number
}

interface WaitingRow {
  id: string
  label: React.ReactNode
  /** Shown as « fin 14:32 » when the API gives it. */
  finishAt?: number
}

interface CallToAction {
  label: string
  to: string
  params?: Record<string, string>
  search?: Record<string, string>
}

interface Props {
  title: string
  to: string
  params: Record<string, string>
  state: DashboardCardState
  onRetry: () => void
  active: ActiveJob | null
  waiting: WaitingRow[]
  limit: number
  /** Idle sentence and its call to action (no job, nothing waiting). */
  empty: { sentence: string, cta: CallToAction }
  /** Replaces « File N / limit » (e.g. no command center). */
  footer?: React.ReactNode
  /** Replaces the whole body (e.g. Enceinte required). */
  blocked?: React.ReactNode
  /** Countdown end: the card's 3 s fallback refetch (slice 042). */
  onJobDone: () => void
}

const ActiveJobBlock: React.FC<{ job: ActiveJob, onDone: () => void }> = ({ job, onDone }) => {
  const { remainingSeconds, elapsedProgress } = useCountdownProgress({
    endAt: job.endAt,
    startAt: job.startAt,
    onDone,
  })
  return (
    <CountdownProgress
      summary={<span className="text-body text-amber">{job.label}</span>}
      elapsedProgress={elapsedProgress}
      remainingSeconds={remainingSeconds}
    />
  )
}

/** Shared layout of the four queue cards (Construction, Recherche, Recrutement, Fortification). */
export const DashboardQueueCard: React.FC<Props> = ({
  title,
  to,
  params,
  state,
  onRetry,
  active,
  waiting,
  limit,
  empty,
  footer,
  blocked,
  onJobDone,
}) => {
  const full = limit > 0 && waiting.length >= limit
  const idle = !active && waiting.length === 0

  return (
    <DashboardCard title={title} to={to} params={params} state={state} onRetry={onRetry}>
      {blocked ?? (
        <div className="space-y-3">
          {active ? (
            <ActiveJobBlock job={active} onDone={onJobDone} />
          ) : idle ? (
            <div className="space-y-1">
              <p className="m-0 text-body text-terminal">Libre</p>
              <DashboardEmpty cta={empty.cta}>{empty.sentence}</DashboardEmpty>
            </div>
          ) : (
            <p className="m-0 text-body text-label">En attente</p>
          )}

          {waiting.length > 0 ? (
            <ol start={2} className="m-0 list-none space-y-1 p-0">
              {waiting.map((row, index) => (
                <li key={row.id} className="flex items-baseline justify-between gap-2 text-meta">
                  <span className="min-w-0 text-amber-dim">
                    <span className="font-mono text-label">{index + 2}.</span> {row.label}
                  </span>
                  {row.finishAt ? (
                    <span className="shrink-0 font-mono tabular-nums text-label">fin {formatFinishClock(row.finishAt)}</span>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : null}

          <p className={classNames('m-0 text-caption', footer ? 'text-label' : 'font-mono', !footer && (full ? 'text-amber' : 'text-label'))}>
            {footer ?? (full ? `File pleine · ${waiting.length} / ${limit}` : `File ${waiting.length} / ${limit}`)}
          </p>
        </div>
      )}
    </DashboardCard>
  )
}

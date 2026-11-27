import React from 'react'
import classNames from 'classnames'

interface ReadoutProps {
  used: number
  limit: number
}

const CAP_TOOLTIP = 'Mouvements sortants et retours, contre la limite des centres de commandement. Les convois de bourse ne comptent pas.'

/** « Mouvements X / Y » meter: movements in flight against the command-center cap (slices 028, 045). */
export const MovementCapacityReadout: React.FC<ReadoutProps> = ({ used, limit }) => {
  const full = used >= limit
  const ratio = limit > 0 ? Math.min(1, used / limit) : 1

  return (
    <div
      className="flex min-w-[10rem] flex-col gap-1"
      role="meter"
      aria-label="Mouvements simultanés"
      aria-valuemin={0}
      aria-valuemax={limit}
      aria-valuenow={used}
      title={CAP_TOOLTIP}
    >
      <p className={classNames('m-0 text-meta', full ? 'text-danger' : 'text-amber-dim')}>
        Mouvements{' '}
        <span className={classNames('font-mono tabular-nums', full ? 'text-danger' : 'text-amber')}>
          {used} / {limit}
        </span>
      </p>
      <div className="h-1.5 overflow-hidden rounded-sm bg-chrome" aria-hidden>
        <div
          className={classNames('h-full', full ? 'bg-danger' : 'bg-amber')}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
    </div>
  )
}

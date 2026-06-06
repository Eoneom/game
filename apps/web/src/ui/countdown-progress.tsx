import React from 'react'

import { formatDurationMmSs } from '#helpers/transform'

export interface CountdownProgressProps {
  summary: React.ReactNode
  elapsedProgress: number
  remainingSeconds: number
  doneLabel?: string
}

export const CountdownProgress: React.FC<CountdownProgressProps> = ({
  summary,
  elapsedProgress,
  remainingSeconds,
  doneLabel = 'Terminé'
}) => {
  const timeLabel = formatDurationMmSs(remainingSeconds)
  const complete = remainingSeconds <= 0
  const fillPct = Math.min(100, Math.max(0, elapsedProgress * 100))

  return (
    <div className="countdown-progress space-y-1 rounded-sm border border-rust/40 bg-chrome/60 p-2">
      <p className="countdown-progress__summary m-0 text-xs text-amber-dim">{summary}</p>
      {complete ? (
        <p className="countdown-progress__time m-0 text-sm text-terminal" aria-live="polite">
          {doneLabel}
        </p>
      ) : (
        <>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(elapsedProgress * 100)}
            aria-valuetext={`${Math.round(elapsedProgress * 100)} pour cent écoulé, ${timeLabel} restant`}
          >
            <div className="countdown-progress__track h-2 overflow-hidden rounded-sm border border-rust/50 bg-chrome">
              <div
                className="countdown-progress__fill h-full bg-gradient-to-r from-copper to-amber transition-[width] duration-500"
                style={{ width: `${fillPct}%` }}
              />
            </div>
          </div>
          <p className="countdown-progress__time m-0 font-mono text-xs text-amber" aria-live="polite">
            {timeLabel}
          </p>
        </>
      )}
    </div>
  )
}

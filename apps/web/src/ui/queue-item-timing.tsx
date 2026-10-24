import React from 'react'

import { useCountdownProgress } from '#hook/countdown-progress'
import { formatDurationMmSs, formatTime } from '#helpers/transform'

interface Props {
  start_at: number
  finish_at: number
  duration_seconds: number
}

/** Remaining time until queue item completes, plus total job duration. */
export const QueueItemTiming: React.FC<Props> = ({
  start_at,
  finish_at,
  duration_seconds,
}) => {
  const { remainingSeconds } = useCountdownProgress({
    onDone: () => undefined,
    endAt: finish_at,
    startAt: start_at,
  })

  return (
    <span className="shrink-0 text-right font-mono text-xs leading-tight text-label">
      <span className="block text-amber-dim">fin {formatDurationMmSs(remainingSeconds)}</span>
      <span className="block opacity-80">{formatTime(duration_seconds)}</span>
    </span>
  )
}

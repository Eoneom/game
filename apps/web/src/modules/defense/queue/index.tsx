import React from 'react'

import { DefenseTranslations } from '#defense/translations'
import { defenseImageSrc } from '#defense/image'
import {
  useCancelDefenseBuild,
  useCancelQueuedDefenseBuild,
  useCityDefenses
} from '#defense/hooks'
import { Button } from '#ui/button'
import { CountdownProgress } from '#ui/countdown-progress'
import { EntityThumb } from '#ui/entity-thumb'
import { QueuePanel } from '#ui/queue-panel'
import { useCountdownProgress } from '#hook/countdown-progress'

interface Props {
  cityId: string
}

/** Active fortification batch and waiting rows (mirrors the recruitment queue). */
export const DefenseBuildQueue: React.FC<Props> = ({ cityId }) => {
  const { data } = useCityDefenses(cityId)
  const cancelBuild = useCancelDefenseBuild(cityId)
  const cancelQueued = useCancelQueuedDefenseBuild(cityId)
  const ongoing = data?.ongoing_build ?? null
  const queue = data?.build_queue ?? []
  const queueLimit = data?.build_queue_limit ?? 0

  const { remainingSeconds, elapsedProgress, reset } = useCountdownProgress({
    endAt: ongoing?.finish_at,
    startAt: ongoing?.started_at,
    onDone: () => undefined,
  })

  return (
    <QueuePanel
      title="Fortification"
      depth={queueLimit > 0 ? `${queue.length}/${queueLimit}` : undefined}
      empty={!ongoing ? 'Aucune fortification en cours' : undefined}
      active={ongoing ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <EntityThumb
            size="md"
            src={defenseImageSrc(ongoing.defense_code)}
            alt={DefenseTranslations[ongoing.defense_code].name}
          />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="m-0 text-body text-amber">
              <span className="font-mono text-body text-amber">{ongoing.remaining_count}</span>{' '}
              {DefenseTranslations[ongoing.defense_code].name}
            </p>
            <CountdownProgress
              summary={<>Construction en cours</>}
              elapsedProgress={elapsedProgress}
              remainingSeconds={remainingSeconds}
            />
            <Button
              variant="danger"
              onClick={() => {
                cancelBuild.mutate()
                reset()
              }}
            >
              Annuler
            </Button>
          </div>
        </div>
      ) : undefined}
      queue={queue.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {queue.map(item => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-sm border border-rust/40 bg-chrome/50 px-2 py-1.5 text-body"
            >
              <span className="min-w-0 text-amber-dim">
                <span className="font-mono text-amber">{item.count}</span>{' '}
                {DefenseTranslations[item.defense_code].name}
              </span>
              <Button
                variant="ghost"
                className="shrink-0 !px-2 !py-1"
                onClick={() => cancelQueued.mutate(item.id)}
              >
                Annuler
              </Button>
            </li>
          ))}
        </ul>
      ) : undefined}
    />
  )
}

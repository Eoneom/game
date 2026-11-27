import React from 'react'

import { TroopTranslations } from '#troop/translations'
import { troopImageSrc } from '#troop/image'
import { Button } from '#ui/button'
import { CountdownProgress } from '#ui/countdown-progress'
import { EntityThumb } from '#ui/entity-thumb'
import { QueuePanel } from '#ui/queue-panel'
import { useCountdownProgress } from '#hook/countdown-progress'
import {
  useListCityTroops,
  useCancelTroop,
  useCityRecruitQueue,
  useCancelQueuedTroopRecruitment
} from '#troop/hooks'
import { TroopItem } from '#types'

type TroopWithRecruitment = TroopItem & { ongoing_recruitment: NonNullable<TroopItem['ongoing_recruitment']> }

interface Props {
  cityId: string
}

export const TroopListInProgress: React.FC<Props> = ({ cityId }) => {
  const { data: troops = [] } = useListCityTroops(cityId)
  const cancelTroop = useCancelTroop(cityId)
  const { data: recruitQueue } = useCityRecruitQueue(cityId)
  const cancelQueued = useCancelQueuedTroopRecruitment(cityId)
  const queue = recruitQueue?.queue ?? []
  const queueLimit = recruitQueue?.limit ?? 0

  const inProgress = troops.find(
    (t): t is TroopWithRecruitment => Boolean(t.ongoing_recruitment)
  )

  const { remainingSeconds, elapsedProgress, reset } = useCountdownProgress({
    endAt: inProgress?.ongoing_recruitment?.finish_at,
    startAt: inProgress?.ongoing_recruitment?.started_at,
    onDone: () => undefined,
  })

  const handleCancel = () => {
    cancelTroop.mutate()
    reset()
  }

  return (
    <QueuePanel
      title="Recrutement"
      depth={queueLimit > 0 ? `${queue.length}/${queueLimit}` : undefined}
      empty={!inProgress ? 'Aucun recrutement en cours' : undefined}
      active={inProgress ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <EntityThumb
            size="md"
            src={troopImageSrc(inProgress.code)}
            alt={TroopTranslations[inProgress.code].name}
          />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="m-0 text-body text-amber">
              <span className="font-mono text-body text-amber">
                {inProgress.ongoing_recruitment.remaining_count}
              </span>{' '}
              {TroopTranslations[inProgress.code].name}
            </p>
            <CountdownProgress
              summary={<>Recrutement en cours</>}
              elapsedProgress={elapsedProgress}
              remainingSeconds={remainingSeconds}
            />
            <Button variant="danger" onClick={handleCancel}>Annuler</Button>
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
                {TroopTranslations[item.troop_code].name}
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

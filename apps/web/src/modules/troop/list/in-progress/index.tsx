import React from 'react'

import { TroopTranslations } from '#troop/translations'
import { troopImageSrc } from '#troop/image'
import { Button } from '#ui/button'
import { CountdownProgress } from '#ui/countdown-progress'
import { EntityThumb } from '#ui/entity-thumb'
import { QueuePanel } from '#ui/queue-panel'
import { useCountdownProgress } from '#hook/countdown-progress'
import { useListCityTroops, useCancelTroop } from '#troop/hooks'
import { TroopItem } from '#types'

type TroopWithRecruitment = TroopItem & { ongoing_recruitment: NonNullable<TroopItem['ongoing_recruitment']> }

interface Props {
  cityId: string
}

export const TroopListInProgress: React.FC<Props> = ({ cityId }) => {
  const { data: troops = [] } = useListCityTroops(cityId)
  const cancelTroop = useCancelTroop(cityId)

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
      empty={!inProgress ? 'Aucun recrutement en cours' : undefined}
      active={inProgress ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <EntityThumb
            size="md"
            src={troopImageSrc(inProgress.code)}
            alt=""
          />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="m-0 text-sm text-amber">
              <span className="font-mono text-base text-amber">
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
    />
  )
}

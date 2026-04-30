import React from 'react'

import { TroopTranslations } from '#troop/translations'
import { Button } from '#ui/button'
import { CountdownProgress } from '#ui/countdown-progress'
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

  if (!inProgress) {
    return null
  }

  const handleCancel = () => {
    cancelTroop.mutate()
    reset()
  }

  return <>
    <CountdownProgress
      summary={
        <>
          En cours: {inProgress.ongoing_recruitment.remaining_count}{' '}
          {TroopTranslations[inProgress.code].name}
        </>
      }
      elapsedProgress={elapsedProgress}
      remainingSeconds={remainingSeconds}
    />
    <Button onClick={handleCancel}>Annuler</Button>
  </>
}

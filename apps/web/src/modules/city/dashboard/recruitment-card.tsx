import React from 'react'

import { queryCardState } from '#location/dashboard/card'
import { useCountdownRefetch } from '#location/dashboard/refetch'
import { troopKeys, useCityRecruitQueue, useListCityTroops } from '#troop/hooks'
import { TroopTranslations } from '#troop/translations'
import { DashboardQueueCard } from '#city/dashboard/queue-card'

/** « Recrutement » (slice 042): the running batch and the waiting batches (one `GET /city/:city_id/troop`). */
export const RecruitmentQueueCard: React.FC<{ cityId: string }> = ({ cityId }) => {
  const troopsQuery = useListCityTroops(cityId)
  const queueQuery = useCityRecruitQueue(cityId)
  const refetch = useCountdownRefetch(troopKeys.cityList(cityId))

  const running = troopsQuery.data?.find(troop => troop.ongoing_recruitment)
  const recruitment = running?.ongoing_recruitment
  const queue = queueQuery.data?.queue ?? []
  const limit = queueQuery.data?.limit ?? 0

  return (
    <DashboardQueueCard
      title="Recrutement"
      to="/city/$cityId/base/troop"
      params={{ cityId }}
      state={queryCardState(troopsQuery, queueQuery)}
      onRetry={() => void troopsQuery.refetch()}
      onJobDone={refetch}
      active={running && recruitment ? {
        label: `${recruitment.remaining_count} ${TroopTranslations[running.code].name}`,
        startAt: recruitment.started_at,
        endAt: recruitment.finish_at,
      } : null}
      waiting={queue.map(item => ({
        id: item.id,
        label: `${item.count} ${TroopTranslations[item.troop_code].name}`,
      }))}
      limit={limit}
      footer={limit === 0 ? 'Construisez un Centre de commandement pour mettre des lots en file.' : undefined}
      empty={{
        sentence: 'Aucun recrutement en cours.',
        cta: { label: 'Recruter', to: '/city/$cityId/base/troop', params: { cityId } },
      }}
    />
  )
}

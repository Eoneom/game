import { AppEvent, type MovementIncomingEventPayload } from '@eoneom/api-client'
import { toast } from 'react-toastify'
import { translateError } from '#helpers/error-translations'
import { formatDate } from '#helpers/transform'
import { wsClient } from '#helpers/websocket'
import { queryClient } from '#helpers/query-client'
import { troopKeys } from '#troop/hooks'
import { cityKeys } from '#city/hooks'
import { outpostKeys } from '#outpost/hooks'
import { reportKeys } from '#communication/report/hooks'
import { activityKeys } from '#location/activity-hooks'
import { mapKeys } from '#map/hooks'

export function registerTroopWsListeners(): void {
  wsClient.on(AppEvent.TroopMovementFinished, () => {
    queryClient.invalidateQueries({ queryKey: troopKeys.movements })
    queryClient.invalidateQueries({ queryKey: ['movement'] })
    queryClient.invalidateQueries({ queryKey: reportKeys.unreadCount })
    queryClient.invalidateQueries({ queryKey: activityKeys.all })
    // Map (slice 044): explore / spy successes explore cells, spy reports feed the targets, settlements may change.
    queryClient.invalidateQueries({ queryKey: mapKeys.exploration })
    queryClient.invalidateQueries({ queryKey: mapKeys.targets })
    queryClient.invalidateQueries({ queryKey: mapKeys.markers })
  })

  wsClient.on(AppEvent.BattleFinished, () => {
    queryClient.invalidateQueries({ queryKey: troopKeys.movements })
    queryClient.invalidateQueries({ queryKey: ['movement'] })
    queryClient.invalidateQueries({ queryKey: ['troops'] })
    queryClient.invalidateQueries({ queryKey: reportKeys.unreadCount })
    queryClient.invalidateQueries({ queryKey: ['reports'] })
    queryClient.invalidateQueries({ queryKey: activityKeys.all })
    queryClient.invalidateQueries({ queryKey: mapKeys.targets })
    queryClient.invalidateQueries({ queryKey: mapKeys.markers })
  })

  // Slice 030: an attack was launched at one of our positions (only sent once detection ≥ 1).
  wsClient.on<MovementIncomingEventPayload>(AppEvent.MovementIncoming, ({ movement_id, arrive_at }) => {
    toast.warn(`Attaque entrante ! Arrivée prévue ${formatDate(arrive_at)}`, {
      toastId: `movement-incoming-${movement_id}`,
      autoClose: 8000,
    })
    queryClient.invalidateQueries({ queryKey: troopKeys.incomingMovements })
  })

  // A finished Détection level adds detail to incoming attacks at once.
  wsClient.on(AppEvent.TechnologyResearchFinished, () => {
    queryClient.invalidateQueries({ queryKey: troopKeys.incomingMovements })
  })

  wsClient.on<{ city_id: string }>(AppEvent.TroopRecruitmentUpdated, ({ city_id }) => {
    queryClient.invalidateQueries({ queryKey: troopKeys.cityList(city_id) })
    queryClient.invalidateQueries({ queryKey: cityKeys.detail(city_id) })
    queryClient.invalidateQueries({ queryKey: activityKeys.all })
  })

  wsClient.on<{ city_id: string, troop_code: string, error_code: string }>(
    AppEvent.TroopQueueItemDropped,
    ({ city_id, error_code }) => {
      toast.error(`Recrutement retiré de la file : ${translateError(error_code)}`)
      queryClient.invalidateQueries({ queryKey: troopKeys.cityList(city_id) })
      queryClient.invalidateQueries({ queryKey: activityKeys.all })
    }
  )

  wsClient.on(AppEvent.OutpostCreated, () => {
    queryClient.invalidateQueries({ queryKey: outpostKeys.all })
    queryClient.invalidateQueries({ queryKey: mapKeys.exploration })
    queryClient.invalidateQueries({ queryKey: mapKeys.markers })
  })

  wsClient.on<{ outpost_id: string }>(AppEvent.OutpostDeleted, ({ outpost_id }) => {
    queryClient.invalidateQueries({ queryKey: outpostKeys.all })
    queryClient.invalidateQueries({ queryKey: outpostKeys.detail(outpost_id) })
    queryClient.invalidateQueries({ queryKey: mapKeys.markers })
  })
}

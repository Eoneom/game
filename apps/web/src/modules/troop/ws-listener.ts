import { AppEvent } from '@eoneom/api-client'
import { wsClient } from '#helpers/websocket'
import { queryClient } from '#helpers/query-client'
import { troopKeys } from '#troop/hooks'
import { cityKeys } from '#city/hooks'
import { outpostKeys } from '#outpost/hooks'
import { reportKeys } from '#communication/report/hooks'

export function registerTroopWsListeners(): void {
  wsClient.on(AppEvent.TroopMovementFinished, () => {
    queryClient.invalidateQueries({ queryKey: troopKeys.movements })
    queryClient.invalidateQueries({ queryKey: reportKeys.unreadCount })
  })

  wsClient.on<{ city_id: string }>(AppEvent.TroopRecruitmentUpdated, ({ city_id }) => {
    queryClient.invalidateQueries({ queryKey: troopKeys.cityList(city_id) })
    queryClient.invalidateQueries({ queryKey: cityKeys.detail(city_id) })
  })

  wsClient.on(AppEvent.OutpostCreated, () => {
    queryClient.invalidateQueries({ queryKey: outpostKeys.all })
  })

  wsClient.on<{ outpost_id: string }>(AppEvent.OutpostDeleted, ({ outpost_id }) => {
    queryClient.invalidateQueries({ queryKey: outpostKeys.all })
    queryClient.invalidateQueries({ queryKey: outpostKeys.detail(outpost_id) })
  })
}

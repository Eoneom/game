import { AppEvent } from '@eoneom/api-client'
import { wsClient } from '#helpers/websocket'
import { queryClient } from '#helpers/query-client'
import { buildingKeys } from '#building/hooks'
import { cityKeys } from '#city/hooks'
import { troopKeys } from '#troop/hooks'
import { activityKeys } from '#location/activity-hooks'

export function registerBuildingWsListeners(): void {
  wsClient.on<{ city_id: string }>(AppEvent.BuildingUpgradeFinished, ({ city_id }) => {
    queryClient.invalidateQueries({ queryKey: buildingKeys.list(city_id) })
    queryClient.invalidateQueries({ queryKey: ['building', city_id] })
    queryClient.invalidateQueries({ queryKey: cityKeys.detail(city_id) })
    queryClient.invalidateQueries({ queryKey: ['technology'] })
    queryClient.invalidateQueries({ queryKey: ['troop'] })
    queryClient.invalidateQueries({ queryKey: troopKeys.cityList(city_id) })
    queryClient.invalidateQueries({ queryKey: activityKeys.all })
  })
}

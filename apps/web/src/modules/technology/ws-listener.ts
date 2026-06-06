import { AppEvent } from '@eoneom/api-client'
import { wsClient } from '#helpers/websocket'
import { queryClient } from '#helpers/query-client'
import { technologyKeys } from '#technology/hooks'
import { activityKeys } from '#location/activity-hooks'

export function registerTechnologyWsListeners(): void {
  wsClient.on(AppEvent.TechnologyResearchFinished, () => {
    queryClient.invalidateQueries({ queryKey: technologyKeys.all })
    queryClient.invalidateQueries({ queryKey: ['technology'] })
    queryClient.invalidateQueries({ queryKey: ['building'] })
    queryClient.invalidateQueries({ queryKey: ['troop'] })
    queryClient.invalidateQueries({ queryKey: activityKeys.all })
  })
}

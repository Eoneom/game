import { AppEvent } from '@eoneom/api-client'
import { toast } from 'react-toastify'
import { wsClient } from '#helpers/websocket'
import { queryClient } from '#helpers/query-client'
import { translateError } from '#helpers/error-translations'
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

  wsClient.on<{ technology_code: string, city_id: string, error_code: string }>(
    AppEvent.TechnologyQueueItemDropped,
    ({ error_code }) => {
      toast.error(translateError(error_code))
      queryClient.invalidateQueries({ queryKey: technologyKeys.all })
    }
  )
}

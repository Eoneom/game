import { AppEvent } from '@eoneom/api-client'
import { wsClient } from '#helpers/websocket'
import { queryClient } from '#helpers/query-client'
import { outpostKeys } from '#outpost/hooks'

export function registerOutpostWsListeners(): void {
  wsClient.on<{ outpost_id: string }>(AppEvent.OutpostResourcesGathered, ({ outpost_id }) => {
    queryClient.invalidateQueries({ queryKey: outpostKeys.detail(outpost_id) })
  })
}

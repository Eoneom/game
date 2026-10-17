import { Factory } from '#adapter/factory'
import { AppEvent } from '#core/events'
import type { AdminSystemPlayerStatsSnapshot } from '@eoneom/api-client/src/endpoints/admin/system-player-stats'

export function emitSystemPlayerStatsUpdated(snapshot: AdminSystemPlayerStatsSnapshot): void {
  Factory.getEventBus().emit(AppEvent.SystemPlayerStatsUpdated, snapshot)
}

import { Factory } from '#adapter/factory'
import { AppEvent } from '#core/events'
import { formatSystemPlayerActionSummary } from '#core/system-player/observability/summary'
import type { SystemTickCategory } from '#core/player/system/tick-category'

export function emitSystemPlayerActionCommitted({
  player_id,
  player_name,
  tick_index,
  category,
  payload,
  committed_at,
}: {
  player_id: string
  player_name: string
  tick_index: number
  category: SystemTickCategory
  payload: Record<string, unknown>
  committed_at: number
}): void {
  const summary = formatSystemPlayerActionSummary({
    player_name,
    category,
    payload,
  })

  Factory.getEventBus().emit(AppEvent.SystemPlayerActionCommitted, {
    committed_at,
    player_id,
    player_name,
    tick_index,
    category,
    summary,
    payload,
  })
}

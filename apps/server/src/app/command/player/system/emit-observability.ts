import { Factory } from '#adapter/factory'
import { AppEvent } from '#core/events'
import type { SystemTickCategory } from '#core/player/system/tick-category'
import type { SystemPlayerTickAttempt } from '#core/system-player/observability/attempt'
import {
  formatSystemPlayerActionSummary,
  formatSystemPlayerErrorSummary,
  formatSystemPlayerIdleSummary,
} from '#core/system-player/observability/summary'

export type SystemPlayerTickObservabilityOutcome = 'success' | 'idle' | 'error'

function safeErrorPayload(err: unknown): { message: string, code?: string } {
  if (err instanceof Error) {
    const message = err.message
    const looks_like_code = /^[a-z][a-z0-9-]*:[a-z0-9-]+$/.test(message)
    if (looks_like_code) {
      return {
        message,
        code: message,
      }
    }
    const trimmed = message.trim().slice(0, 200)
    return {
      message: trimmed.length > 0 ? trimmed : 'system-player:tick-failed',
    }
  }
  return {
    message: 'system-player:tick-failed',
  }
}

export function emitSystemPlayerTickObservability({
  player_id,
  player_name,
  tick_index,
  committed_at,
  outcome,
  attempts,
  category,
  payload,
  error,
}: {
  player_id: string
  player_name: string
  tick_index: number
  committed_at: number
  outcome: SystemPlayerTickObservabilityOutcome
  attempts: SystemPlayerTickAttempt[]
  category?: SystemTickCategory
  payload?: Record<string, unknown>
  error?: unknown
}): void {
  let summary: string
  let event_payload: Record<string, unknown>

  if (outcome === 'success' && category && payload) {
    summary = formatSystemPlayerActionSummary({
      player_name,
      category,
      payload,
    })
    event_payload = payload
  } else if (outcome === 'idle') {
    summary = formatSystemPlayerIdleSummary({
      player_name,
      attempts,
    })
    event_payload = {}
  } else {
    const safe = error != null ? safeErrorPayload(error) : { message: 'system-player:tick-failed' }
    summary = formatSystemPlayerErrorSummary({
      player_name,
      message: safe.message,
    })
    event_payload = safe.code
      ? {
          error_code: safe.code,
          error_message: safe.message,
        }
      : {
          error_message: safe.message,
        }
  }

  Factory.getEventBus().emit(AppEvent.SystemPlayerActionCommitted, {
    committed_at,
    player_id,
    player_name,
    tick_index,
    outcome,
    attempts,
    summary,
    category: outcome === 'success' ? category : undefined,
    payload: event_payload,
  })
}

/** @deprecated Use emitSystemPlayerTickObservability */
export function emitSystemPlayerActionCommitted(args: {
  player_id: string
  player_name: string
  tick_index: number
  category: SystemTickCategory
  payload: Record<string, unknown>
  committed_at: number
  attempts?: SystemPlayerTickAttempt[]
}): void {
  emitSystemPlayerTickObservability({
    ...args,
    outcome: 'success',
    attempts: args.attempts ?? [
      {
        category: args.category,
        result: 'success',
      },
    ],
  })
}

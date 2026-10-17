export type SystemPlayerObservabilityEvent = {
  committed_at: number
  player_id: string
  player_name: string
  tick_index: number
  category: string
  summary: string
  payload: Record<string, unknown>
}

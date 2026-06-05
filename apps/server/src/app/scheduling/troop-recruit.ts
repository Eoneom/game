export const TROOP_RECRUIT_PROGRESS_MIN_INTERVAL_MS = 5_000

export const nextTroopRecruitProgressAt = ({
  finish_at,
  remaining_count,
  now: now_ms
}: {
  finish_at: number
  remaining_count: number
  now: number
}): number => {
  const remaining_ms = Math.max(0, finish_at - now_ms)
  if (remaining_ms === 0 || remaining_count <= 0) {
    return finish_at
  }

  const ms_per_unit = remaining_ms / remaining_count
  const delay = Math.min(remaining_ms, Math.max(TROOP_RECRUIT_PROGRESS_MIN_INTERVAL_MS, ms_per_unit))
  return now_ms + delay
}

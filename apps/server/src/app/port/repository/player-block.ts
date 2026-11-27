export type PlayerBlockEntry = {
  blocked_id: string
  created_at: number
}

export type PlayerBlockRepository = {
  /** Idempotent. */
  block(args: { blocker_id: string, blocked_id: string, created_at: number }): Promise<void>

  /** Idempotent. */
  unblock(args: { blocker_id: string, blocked_id: string }): Promise<void>

  isBlocked(args: { blocker_id: string, blocked_id: string }): Promise<boolean>

  /** Players the blocker blocked, most recent first. */
  listBlocked(blocker_id: string): Promise<PlayerBlockEntry[]>

  /** Players who blocked `blocked_id`. */
  listBlockerIds(blocked_id: string): Promise<string[]>
}

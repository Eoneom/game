export class AdminAccessService {
  static isAllowlistedPlayerName({
    player_name,
    allowlist,
  }: {
    player_name: string
    allowlist: readonly string[]
  }): boolean {
    if (allowlist.length === 0) {
      return false
    }

    return allowlist.includes(player_name)
  }
}

import { parseAdminPlayerNames } from '#core/admin/parse-allowlist'

let cached_allowlist: string[] | null = null

export function getAdminPlayerNamesFromEnv(): string[] {
  if (cached_allowlist === null) {
    cached_allowlist = parseAdminPlayerNames(process.env.ADMIN_PLAYER_NAMES)
  }

  return cached_allowlist
}

export function resetAdminPlayerNamesCacheForTests(): void {
  cached_allowlist = null
}

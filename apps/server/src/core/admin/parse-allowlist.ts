export function parseAdminPlayerNames(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return []
  }

  return raw
    .split(',')
    .map(name => name.trim())
    .filter(name => name.length > 0)
}

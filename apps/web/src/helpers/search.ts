/** Keeps a URL search value only when it is one of `allowed` (route `validateSearch`, slice 043). */
export const pickSearchValue = <T extends string>(allowed: readonly T[], value: unknown): T | undefined =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value) ? value as T : undefined

/** Integer query parameter, or `null` when missing or not a number. */
export const parseIntegerParam = (value: unknown): number | null => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null
  }
  const parsed = Number.parseInt(`${value}`, 10)
  return Number.isFinite(parsed) ? parsed : null
}

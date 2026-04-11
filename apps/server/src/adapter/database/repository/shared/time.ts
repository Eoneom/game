export function toTimestamp(ms: number | null | undefined): Date | null {
  if (ms === null || ms === undefined) {
    return null
  }

  return new Date(ms)
}

export function fromTimestamp(value: Date | string | null): number | null {
  if (value === null) {
    return null
  }

  return new Date(value).getTime()
}

export function toTimestampRequired(ms: number): Date {
  return new Date(ms)
}

export function fromTimestampRequired(value: Date | string): number {
  return new Date(value).getTime()
}

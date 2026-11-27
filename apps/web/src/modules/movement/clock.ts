const pad = (value: number): string => String(value).padStart(2, '0')

/** Local arrival clock « HH:mm:ss », prefixed with « dd/MM » when it is not today (slice 045). */
export const formatArrivalClock = (timestamp: number, now: number): string => {
  const date = new Date(timestamp)
  const today = new Date(now)
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  const same_day = date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate()
  return same_day ? time : `${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${time}`
}

/** Whole seconds left until `timestamp` (0 once reached). */
export const secondsUntil = (timestamp: number, now: number): number => Math.max(0, Math.ceil((timestamp - now) / 1000))

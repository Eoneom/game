import { Coordinates } from '@eoneom/api-client'

export const formatDurationMmSs = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const secs = s % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const secondsWithoutHours = seconds % 3600
  const minutes = Math.floor(secondsWithoutHours / 60)
  const remainingSeconds = secondsWithoutHours % 60

  if (hours) {
    return `${hours}h ${minutes}min ${remainingSeconds}s`
  }

  if (minutes) {
    return `${minutes}min ${remainingSeconds}s`
  }

  return `${remainingSeconds}s`
}

export const transformApproximateTimeUntilSeconds = (seconds: number): string => {
  return `~${formatTime(Math.ceil(seconds))}`
}

export const formatCoordinates = (coordinates: Coordinates): string => {
  return `${coordinates.x}.${coordinates.y}`
}

export const formatDate = (timestamp: number): string => {
  const d = new Date(timestamp)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

export const getRemainingSeconds = (date?: number): number => {
  if (!date) {
    return 0
  }

  const remainingTime = (date ?? 0) - (new Date().getTime())
  return Math.ceil(remainingTime/1000)
}

export const transformHourlyEarnings = (value: number): string => {
  return `~${transformDecimals(Math.round(value * 3600))}/h`
}

export const transformDailyEarnings = (value: number): string => {
  return `~${transformDecimals(Math.round(value * 3600 * 24))}/j`
}

export const transformDecimals = (value?: number): string => {
  if (!value) {
    return ''
  }

  const steps = [
    { threshold: 1000000000, unit: 'T' },
    { threshold: 1000000, unit: 'M' },
    { threshold: 1000, unit: 'k' }
  ]

  for(const step of steps) {
    if (value >= step.threshold) {
      return `${floorValue(value / step.threshold)}${step.unit}`
    }
  }

  return `${value}`
}

const floorValue = (value: number, decimals = 2): number => {
  const factor = Math.pow(10, decimals)
  return Math.floor(value*factor)/factor
}

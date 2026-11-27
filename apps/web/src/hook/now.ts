import { useEffect, useState } from 'react'

/** Current time (ms), refreshed every `intervalMs`: one shared ticker for a whole table (slice 045). */
export const useNow = (intervalMs = 1000): number => {
  const [ now, setNow ] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(interval)
  }, [ intervalMs ])

  return now
}

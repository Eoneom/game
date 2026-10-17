import { useEffect, useState, useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'

import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { useAuth } from '#auth/context'
import {
  getSystemPlayerObservabilityEvents,
  subscribeSystemPlayerObservabilityEvents,
} from './event-store'
import {
  getSystemPlayerStatsSnapshots,
  replaceSystemPlayerStatsSnapshots,
  subscribeSystemPlayerStatsSnapshots,
} from './stats-store'
import { registerSystemPlayerObservabilityWsListener } from './ws-listener'

export const useObservabilitySession = () => {
  const { token } = useAuth()

  return useQuery({
    queryKey: [ 'admin', 'system-player-observability' ],
    enabled: Boolean(token),
    queryFn: async () => {
      if (!token) {
        throw new Error('token:not-found')
      }
      const res = await client.admin.getSystemPlayerObservability(token)
      if (isError(res)) {
        throw new Error(res.error_code)
      }
      return res.data
    },
  })
}

export const useLiveSystemPlayerEvents = () => {
  return useSyncExternalStore(
    subscribeSystemPlayerObservabilityEvents,
    getSystemPlayerObservabilityEvents,
    getSystemPlayerObservabilityEvents
  )
}

export const useSystemPlayerNameFilter = () => {
  const [ filter, setFilter ] = useState<string>('')

  return {
    filter,
    setFilter,
  }
}

export const useRegisterObservabilityWsWhenAdmin = (is_admin: boolean | undefined) => {
  useEffect(() => {
    if (!is_admin) {
      return
    }
    registerSystemPlayerObservabilityWsListener()
  }, [ is_admin ])
}

export const useSystemPlayerStats = (is_admin: boolean | undefined) => {
  const { token } = useAuth()
  const live_snapshots = useSyncExternalStore(
    subscribeSystemPlayerStatsSnapshots,
    getSystemPlayerStatsSnapshots,
    getSystemPlayerStatsSnapshots
  )

  const query = useQuery({
    queryKey: [ 'admin', 'system-player-stats' ],
    enabled: Boolean(token) && Boolean(is_admin),
    queryFn: async () => {
      if (!token) {
        throw new Error('token:not-found')
      }
      const res = await client.admin.getSystemPlayerStats(token)
      if (isError(res)) {
        throw new Error(res.error_code)
      }
      replaceSystemPlayerStatsSnapshots(res.data.players)
      return res.data.players
    },
  })

  return {
    snapshots: live_snapshots,
    isPending: query.isPending,
    refetch: query.refetch,
  }
}

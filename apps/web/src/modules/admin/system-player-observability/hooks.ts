import { useEffect, useState, useSyncExternalStore } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'react-toastify'

import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { useAuth } from '#auth/context'
import {
  getSystemPlayerObservabilityEvents,
  subscribeSystemPlayerObservabilityEvents,
} from './event-store'
import { adminObservabilityWsClient } from '#helpers/admin-observability-websocket'
import {
  getSystemPlayerStatsSnapshots,
  replaceSystemPlayerStatsSnapshots,
  subscribeSystemPlayerStatsSnapshots,
} from './stats-store'
import { registerSystemPlayerObservabilityWsListener } from './ws-listener'
import { translateError } from '#helpers/error-translations'

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
  const { token } = useAuth()

  useEffect(() => {
    if (!is_admin || !token) {
      return
    }
    registerSystemPlayerObservabilityWsListener()
    adminObservabilityWsClient.connect(token)
    return () => {
      adminObservabilityWsClient.disconnect()
    }
  }, [ is_admin, token ])
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
    refetchInterval: is_admin ? 5_000 : false,
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

export const useForceSystemPlayerTick = (is_admin: boolean | undefined) => {
  const { token } = useAuth()

  return useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error('token:not-found')
      }
      const res = await client.admin.forceSystemPlayerTick(token)
      if (isError(res)) {
        throw new Error(res.error_code)
      }
      return res.data
    },
    onSuccess: data => {
      toast.success(
        `Tick ${data.tick_index} exécuté pour ${data.system_player_count} joueur(s) système. Prochain tick ${data.next_tick_index}.`,
      )
    },
    onError: (err: Error) => {
      toast.error(translateError(err.message))
    },
  })
}

import { useEffect, useState, useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'

import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { useAuth } from '#auth/context'
import {
  getSystemPlayerObservabilityEvents,
  subscribeSystemPlayerObservabilityEvents,
} from './event-store'
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

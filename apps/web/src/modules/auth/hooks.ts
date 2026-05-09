import { useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'

import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { wsClient } from '#helpers/websocket'
import { useAuth } from '#auth/context'
import { registerCityWsListeners } from '#city/ws-listener'
import { registerBuildingWsListeners } from '#building/ws-listener'
import { registerTechnologyWsListeners } from '#technology/ws-listener'
import { registerTroopWsListeners } from '#troop/ws-listener'
import { registerOutpostWsListeners } from '#outpost/ws-listener'

const doLogin = async (playerName: string): Promise<string> => {
  const res = await client.player.login({ player_name: playerName })
  if (isError(res)) {
    throw new Error(res.error_code)
  }
  if (!res.data?.token) {
    throw new Error('token:not-in-response')
  }
  return res.data.token
}

const doSignup = async (playerName: string): Promise<void> => {
  const res = await client.player.signup({
    player_name: playerName,
    city_name: `${playerName}City`,
  })
  if (isError(res)) {
    throw new Error(res.error_code)
  }
}

export const useLogin = () => {
  const { setToken } = useAuth()

  return useMutation({
    mutationFn: async (playerName: string) => {
      let token: string
      try {
        token = await doLogin(playerName)
      } catch {
        await doSignup(playerName)
        token = await doLogin(playerName)
      }
      return token
    },
    onSuccess: (token) => {
      setToken(token)
      registerCityWsListeners()
      registerBuildingWsListeners()
      registerTechnologyWsListeners()
      registerTroopWsListeners()
      registerOutpostWsListeners()
      wsClient.connect(token)
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}

export const useLogout = () => {
  const { token, clearToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!token) return
      const res = await client.player.logout(token)
      if (isError(res)) {
        throw new Error(res.error_code)
      }
    },
    onSuccess: () => {
      clearToken()
      wsClient.disconnect()
      queryClient.clear()
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}

export const useInitStoredToken = () => {
  const { token } = useAuth()

  useEffect(() => {
    if (!token) return
    registerCityWsListeners()
    registerBuildingWsListeners()
    registerTechnologyWsListeners()
    registerTroopWsListeners()
    registerOutpostWsListeners()
    wsClient.connect(token)
  }, [])
}

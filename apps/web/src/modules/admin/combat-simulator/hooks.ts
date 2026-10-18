import { useMutation } from '@tanstack/react-query'
import { toast } from 'react-toastify'

import {
  AdminCombatSimulatorRequest,
  CombatStrategy,
  TroopCode,
} from '@eoneom/api-client'
import { useAuth } from '#auth/context'
import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { translateError } from '#helpers/error-translations'

export type CombatSimulatorStackRow = {
  troop_code: TroopCode
  count: number
}

export const defaultCombatSimulatorStack = (): CombatSimulatorStackRow => ({
  troop_code: TroopCode.LEGIONNAIRE,
  count: 10,
})

export const useCombatSimulator = (is_admin: boolean | undefined) => {
  const { token } = useAuth()

  return useMutation({
    mutationFn: async (body: AdminCombatSimulatorRequest) => {
      if (!token) {
        throw new Error('token:not-found')
      }
      if (!is_admin) {
        throw new Error('admin:forbidden')
      }
      const res = await client.admin.simulateCombat(token, body)
      if (isError(res)) {
        throw new Error(res.error_code)
      }
      return res.data
    },
    onError: (err: Error) => {
      toast.error(translateError(err.message))
    },
  })
}

export const PVP_COMBAT_TROOP_CODES: TroopCode[] = [
  TroopCode.LEGIONNAIRE,
  TroopCode.INTERCEPTOR,
  TroopCode.ASSAULT_BEHEMOTH,
  TroopCode.SHOCK_TROOPER,
  TroopCode.PRIME_UNIT,
  TroopCode.STRIKER_DRONE,
  TroopCode.WAR_MACHINE,
  TroopCode.DISRUPTOR,
]

export const COMBAT_STRATEGY_OPTIONS = Object.values(CombatStrategy)

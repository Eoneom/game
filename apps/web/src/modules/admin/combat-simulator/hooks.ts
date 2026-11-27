import { useMutation } from '@tanstack/react-query'
import { toast } from 'react-toastify'

import {
  AdminCombatSimulatorRequest,
  CombatStrategy,
  FactionCode,
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

export type CombatSimulatorFaction =
  | FactionCode.THE_CONFEDERATION
  | FactionCode.THE_TECHNOLOGICAL_SINGULARITY
  | FactionCode.THE_ASH_LITURGY
  | FactionCode.THE_SYMBIOSIS
  | FactionCode.THE_BASTION_ORDER

export const COMBAT_SIMULATOR_FACTION_OPTIONS: {
  code: CombatSimulatorFaction
  label: string
}[] = [
  {
    code: FactionCode.THE_CONFEDERATION,
    label: 'Confédération',
  },
  {
    code: FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
    label: 'Singularité',
  },
  {
    code: FactionCode.THE_ASH_LITURGY,
    label: 'Liturgie des cendres',
  },
  {
    code: FactionCode.THE_SYMBIOSIS,
    label: 'Symbiose',
  },
  {
    code: FactionCode.THE_BASTION_ORDER,
    label: 'Ordre du Bastion',
  },
]

export const PVP_COMBAT_TROOP_CODES_BY_FACTION: Record<
  CombatSimulatorFaction,
  TroopCode[]
> = {
  [FactionCode.THE_CONFEDERATION]: [
    TroopCode.LEGIONNAIRE,
    TroopCode.INTERCEPTOR,
    TroopCode.ASSAULT_BEHEMOTH,
    TroopCode.SHOCK_TROOPER,
  ],
  [FactionCode.THE_TECHNOLOGICAL_SINGULARITY]: [
    TroopCode.PRIME_UNIT,
    TroopCode.STRIKER_DRONE,
    TroopCode.WAR_MACHINE,
    TroopCode.DISRUPTOR,
  ],
  [FactionCode.THE_ASH_LITURGY]: [
    TroopCode.PENITENT_HORDE,
    TroopCode.WRAITH_LANCER,
    TroopCode.CINDER_TITAN,
    TroopCode.HEMORRHAGE_CULTIST,
  ],
  [FactionCode.THE_SYMBIOSIS]: [
    TroopCode.ROOT_WARDEN,
    TroopCode.SPORE_SWARM,
    TroopCode.FUNGAL_COLOSSUS,
    TroopCode.TOXIC_HOWLER,
  ],
  [FactionCode.THE_BASTION_ORDER]: [
    TroopCode.GRENADIER,
    TroopCode.DRAGOON,
    TroopCode.SIEGE_TANK,
    TroopCode.MOBILE_MORTAR,
  ],
}

export const defaultCombatSimulatorStack = (
  faction: CombatSimulatorFaction,
): CombatSimulatorStackRow => ({
  troop_code: PVP_COMBAT_TROOP_CODES_BY_FACTION[faction][0],
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

export const COMBAT_STRATEGY_OPTIONS = Object.values(CombatStrategy)

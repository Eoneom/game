import { AppEvent } from '@eoneom/api-client'
import { toast } from 'react-toastify'
import { translateError } from '#helpers/error-translations'
import { wsClient } from '#helpers/websocket'
import { queryClient } from '#helpers/query-client'
import { cityKeys } from '#city/hooks'
import { defenseKeys } from '#defense/hooks'

export function registerDefenseWsListeners(): void {
  wsClient.on<{ city_id: string }>(AppEvent.DefenseBuildUpdated, ({ city_id }) => {
    queryClient.invalidateQueries({ queryKey: defenseKeys.list(city_id) })
    queryClient.invalidateQueries({ queryKey: cityKeys.detail(city_id) })
  })

  wsClient.on<{ city_id: string, defense_code: string, error_code: string }>(
    AppEvent.DefenseQueueItemDropped,
    ({ city_id, error_code }) => {
      toast.error(`Fortification retirée de la file : ${translateError(error_code)}`)
      queryClient.invalidateQueries({ queryKey: defenseKeys.list(city_id) })
    }
  )

  // A new Enceinte level raises the capacity and shortens build times.
  wsClient.on<{ city_id: string }>(AppEvent.BuildingUpgradeFinished, ({ city_id }) => {
    queryClient.invalidateQueries({ queryKey: defenseKeys.list(city_id) })
  })

  // Battles destroy defenses and batteries spend plasma.
  wsClient.on(AppEvent.BattleFinished, () => {
    queryClient.invalidateQueries({ queryKey: defenseKeys.all })
  })
}

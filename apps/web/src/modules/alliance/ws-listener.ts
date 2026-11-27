import {
  AppEvent,
  type AllianceLeftEventPayload,
  type ReinforcementArrivedEventPayload,
  type ReinforcementRecalledEventPayload,
} from '@eoneom/api-client'
import { toast } from 'react-toastify'

import { wsClient } from '#helpers/websocket'
import { queryClient } from '#helpers/query-client'
import { allianceKeys } from '#alliance/hooks'
import { reportKeys } from '#communication/report/hooks'

const LEFT_MESSAGES: Record<AllianceLeftEventPayload['reason'], string> = {
  leave: 'Vous avez quitté votre alliance',
  kick: 'Vous avez été exclu de votre alliance',
  dissolve: 'Votre alliance a été dissoute',
}

let registered = false

export function registerAllianceWsListeners(): void {
  if (registered) return
  registered = true

  const refreshAlliance = () => {
    queryClient.invalidateQueries({ queryKey: allianceKeys.all })
    queryClient.invalidateQueries({ queryKey: ['reinforcements'] })
  }

  wsClient.on(AppEvent.AllianceUpdated, refreshAlliance)

  // Stationed troops change when a reinforce or recall movement finishes, or after a battle.
  const refreshReinforcements = () => queryClient.invalidateQueries({ queryKey: ['reinforcements'] })
  wsClient.on(AppEvent.TroopMovementFinished, refreshReinforcements)
  wsClient.on(AppEvent.BattleFinished, refreshReinforcements)

  wsClient.on(AppEvent.AllianceInvitationReceived, () => {
    toast.info('Nouvelle invitation d\'alliance')
    queryClient.invalidateQueries({ queryKey: allianceKeys.invitations })
  })

  wsClient.on(AppEvent.AllianceApplicationReceived, () => {
    toast.info('Nouvelle candidature à votre alliance')
    queryClient.invalidateQueries({ queryKey: allianceKeys.applications })
  })

  wsClient.on(AppEvent.AllianceJoined, () => {
    toast.success('Vous avez rejoint une alliance')
    refreshAlliance()
  })

  wsClient.on<AllianceLeftEventPayload>(AppEvent.AllianceLeft, ({ reason }) => {
    toast.info(LEFT_MESSAGES[reason])
    refreshAlliance()
    queryClient.removeQueries({ queryKey: [ 'chat', 'alliance' ] })
    queryClient.invalidateQueries({ queryKey: ['movements'] })
  })

  wsClient.on<ReinforcementArrivedEventPayload>(AppEvent.ReinforcementArrived, ({ city_id }) => {
    toast.info('Des renforts alliés sont arrivés dans votre ville')
    queryClient.invalidateQueries({ queryKey: allianceKeys.reinforcements(city_id) })
    queryClient.invalidateQueries({ queryKey: reportKeys.unreadCount })
    queryClient.invalidateQueries({ queryKey: ['reports'] })
  })

  wsClient.on<ReinforcementRecalledEventPayload>(AppEvent.ReinforcementRecalled, ({ city_id }) => {
    toast.info('Des renforts alliés ont quitté votre ville')
    queryClient.invalidateQueries({ queryKey: allianceKeys.reinforcements(city_id) })
  })
}

import React from 'react'
import { AppEvent, type BattleFinishedEventPayload } from '@eoneom/api-client'
import { toast } from 'react-toastify'

import { wsClient } from '#helpers/websocket'
import { BattleReportToast } from '#communication/report/battle-toast'
import { battleResultKind } from '#communication/report/translations'

let registered = false

export function registerCommunicationWsListeners(): void {
  if (registered) return
  registered = true

  wsClient.on<BattleFinishedEventPayload>(AppEvent.BattleFinished, (payload) => {
    if (!payload.report_id) return
    const kind = battleResultKind(payload)
    const notify = kind === 'victory' ? toast.success : kind === 'defeat' ? toast.error : toast.info
    notify(
      ({ closeToast }) => React.createElement(BattleReportToast, { payload, closeToast }),
      { toastId: `battle-report-${payload.report_id}`, autoClose: 8000 }
    )
  })
}

import React from 'react'
import { Link } from '@tanstack/react-router'
import type { BattleFinishedEventPayload } from '@eoneom/api-client'

import { battleResultLabel } from '#communication/report/translations'

export const BattleReportToast: React.FC<{
  payload: BattleFinishedEventPayload
  closeToast?: () => void
}> = ({ payload, closeToast }) => (
  <div className="flex flex-col gap-1">
    <span>Nouveau rapport de bataille</span>
    <span className="text-amber">
      {battleResultLabel({ perspective: payload.perspective, winner: payload.winner })}
    </span>
    <Link
      to="/inbox/report"
      search={{ report_id: payload.report_id }}
      className="underline"
      onClick={() => closeToast?.()}
    >
      Voir le rapport
    </Link>
  </div>
)

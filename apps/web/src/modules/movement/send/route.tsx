import React from 'react'

import { MovementSendWizard } from '#movement/send'
import {
  MovementSendSearch,
  parseMovementSendSearch,
  serializeMovementSendState,
} from '#movement/send/search'
import {
  MovementOrigin,
  movementListPath,
  movementSendPath,
  usePathNavigate,
} from '#movement/navigation'

interface Props {
  origin: MovementOrigin
  search: MovementSendSearch
}

/** URL host of the send wizard: search params ↔ wizard state, router navigation for send, cancel and origin. */
export const MovementSendRoute: React.FC<Props> = ({ origin, search }) => {
  const navigate = usePathNavigate()
  const sendPath = movementSendPath(origin)

  return (
    <MovementSendWizard
      origin={origin}
      state={parseMovementSendSearch(search as Record<string, unknown>)}
      onStateChange={(next, { push }) => navigate({
        to: sendPath,
        search: serializeMovementSendState(next) as Record<string, unknown>,
        replace: !push,
      })}
      onSent={movement_id => navigate({ to: `${movementListPath(origin)}/${movement_id}`, search: { tab: 'sortants' } })}
      onCancel={() => navigate({ to: movementListPath(origin), search: { tab: 'sortants' } })}
      onOriginChange={(next, state) => navigate({
        to: movementSendPath(next),
        search: serializeMovementSendState(state) as Record<string, unknown>,
      })}
    />
  )
}

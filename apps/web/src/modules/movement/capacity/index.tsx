import React from 'react'

import { useMovementCapacity } from '#troop/hooks'

interface ReadoutProps {
  used: number
  limit: number
}

/** "Mouvements X / Y": movements in flight against the command-center cap. */
export const MovementCapacityReadout: React.FC<ReadoutProps> = ({ used, limit }) => {
  const full = used >= limit
  return (
    <p className={`m-0 text-sm ${full ? 'text-danger' : 'text-amber-dim'}`}>
      Mouvements{' '}
      <span className="font-mono tabular-nums text-amber">
        {used} / {limit}
      </span>
    </p>
  )
}

export const MovementCapacity: React.FC = () => {
  const { data } = useMovementCapacity()
  if (!data) {
    return null
  }
  return <MovementCapacityReadout used={data.used} limit={data.limit} />
}

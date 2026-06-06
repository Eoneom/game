import React from 'react'

import { LayoutPage } from '#ui/layout/page'
import { MovementList } from '#movement/list'
import { MovementDetails } from '#movement/details'
import { MovementCreate } from '#movement/create'
import { useGetMovement } from '#troop/hooks'

type MovementPageProps = (
  | { cityId: string; outpostId?: never }
  | { cityId?: never; outpostId: string }
) & {
  movementId?: string
}

export const MovementPage: React.FC<MovementPageProps> = ({ cityId, outpostId, movementId }) => {
  const { data: movement } = useGetMovement(movementId)

  return (
    <LayoutPage details={movement && <MovementDetails movement={movement} />}>
      <div className="space-y-4">
        {cityId
          ? <MovementCreate cityId={cityId} />
          : outpostId
            ? <MovementCreate outpostId={outpostId} />
            : null}
        <MovementList />
      </div>
    </LayoutPage>
  )
}

import React from 'react'

import { useRecruitTroop, useListCityTroops } from '#troop/hooks'
import { Button } from '#ui/button'
import { Troop, TroopItem } from '#types'

type TroopWithRecruitment = TroopItem & { ongoing_recruitment: NonNullable<TroopItem['ongoing_recruitment']> }

interface Props {
  cityId: string
  troop: Troop
  count: number
  onChange: (count: number) => void
  canRecruit: boolean
}

export const TroopDetailsRecruit: React.FC<Props> = ({ cityId, troop, onChange, count, canRecruit }) => {
  const { data: troops = [] } = useListCityTroops(cityId)
  const recruit = useRecruitTroop(cityId)

  const inProgress = troops.find(
    (t): t is TroopWithRecruitment => Boolean(t.ongoing_recruitment)
  )

  if (inProgress) {
    return null
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex min-w-[7rem] flex-col gap-1">
        <span className="field-label">Quantité</span>
        <input
          type="number"
          className="field-input field-input--number w-28"
          value={count}
          min={1}
          onChange={event => {
            const value = Number.parseInt(event.target.value, 10)
            if (Number.isNaN(value) || value <= 0) {
              onChange(1)
              return
            }
            onChange(value)
          }}
        />
      </label>

      <Button
        disabled={!canRecruit}
        onClick={() => {
          recruit.mutate({ code: troop.code, count })
          onChange(1)
        }}
      >
        Recruter
      </Button>
    </div>
  )
}

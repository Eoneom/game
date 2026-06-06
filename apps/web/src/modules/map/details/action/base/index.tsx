import React, { useState } from 'react'

import { MovementAction, TroopCode } from '@eoneom/api-client'

import { useGetCity } from '#city/hooks'
import { useGetOutpost } from '#outpost/hooks'
import { useListTroops, useCreateMovement } from '#troop/hooks'
import { TroopTranslations } from '#troop/translations'
import { Button } from '#ui/button'

type Props =
  | { cityId: string; outpostId?: never }
  | { cityId?: never; outpostId: string }

interface CoordinatesInput {
  coordinates: {
    x: number
    y: number
    sector: number
  }
}

export const MapDetailsActionBase: React.FC<Props & CoordinatesInput> = ({ cityId, outpostId, coordinates }) => {
  const { data: city } = useGetCity(cityId)
  const { data: outpost } = useGetOutpost(outpostId)
  const { data: troops = [] } = useListTroops(cityId ? { cityId } : { outpostId: outpostId as string })
  const createMovement = useCreateMovement()

  const [troopsToBase, setTroopsToBase] = useState<Partial<Record<TroopCode, number>>>({})

  const handleBase = () => {
    const origin = city?.coordinates ?? outpost?.coordinates
    if (!origin) return

    const finalTroops = Object.entries(troopsToBase)
      .filter(([, value]) => value)
      .map(([key, value]) => ({
        code: key as TroopCode,
        count: value as number
      }))

    if (!finalTroops.length) return

    createMovement.mutate({
      action: MovementAction.BASE,
      origin,
      destination: coordinates,
      troops: finalTroops
    })
  }

  return (
    <div className="space-y-3">
      <h3 className="m-0 field-label">Troupes à baser</h3>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {troops.map(troop => {
          const { name } = TroopTranslations[troop.code]
          const value = troopsToBase[troop.code] ?? 0
          return (
            <li
              key={troop.code}
              className="flex items-center justify-between gap-3 rounded-sm border border-rust/40 bg-chrome/50 px-2 py-1.5"
            >
              <span className="min-w-0 flex-1 text-sm text-amber-dim">{name}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="field-input field-input--number w-20"
                  min={0}
                  max={troop.count}
                  value={value}
                  onChange={event => {
                    const next = Number.parseInt(event.target.value, 10)
                    setTroopsToBase({
                      ...troopsToBase,
                      [troop.code]: Number.isNaN(next)
                        ? 0
                        : Math.min(Math.max(0, next), troop.count),
                    })
                  }}
                />
                <span className="inline-block w-10 text-right font-mono text-xs tabular-nums text-label">
                  / {troop.count}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
      <Button onClick={handleBase}>Baser</Button>
    </div>
  )
}

import React, { useEffect, useMemo, useState } from 'react'
import { Coordinates, MovementAction, OutpostType, TroopCode } from '@eoneom/api-client'

import { MovementCreateAction } from './action'
import { MovementCreateDestination } from './destination'
import { MovementCreateEstimation } from './estimation'
import { MovementCreateResources } from './resources'
import { MovementCreateTroops } from './troops'
import { MovementCreateWarning } from './warning'
import { MovementEstimation } from '#types'
import { useGetOutpost } from '#outpost/hooks'
import { useGetCity } from '#city/hooks'
import { useListTroops } from '#troop/hooks'
import { estimateMovement } from '../api/estimate'
import { useAuth } from '#auth/context'
import { useCreateMovement } from '#troop/hooks'

type MovementCreateProps =
  | { cityId: string; outpostId?: never }
  | { cityId?: never; outpostId: string }

export const MovementCreate: React.FC<MovementCreateProps> = ({ cityId, outpostId }) => {
  const { token } = useAuth()
  const { data: city } = useGetCity(cityId)
  const { data: outpost } = useGetOutpost(outpostId)
  const { data: troops = [] } = useListTroops(cityId ? { cityId } : { outpostId: outpostId as string })
  const createMovement = useCreateMovement()

  const [ selectedTroops, setSelectedTroops ] = useState<Partial<Record<TroopCode, number>>>({})
  const [ destination, setDestination ] = useState<Coordinates>({ x: 1, y: 1, sector: 1 })
  const [ estimation, setEstimation ] = useState<MovementEstimation>({
    speed: 0,
    duration: 0,
    distance: 0,
    transport_capacity: 0,
  })
  const [ action, setAction ] = useState<MovementAction>(MovementAction.BASE)
  const [ resources, setResources ] = useState({ plastic: 0, mushroom: 0 })

  const cityCoordinates = city?.coordinates ?? null
  const outpostCoordinates = outpost?.coordinates ?? null
  const availablePlastic = city?.plastic ?? outpost?.plastic ?? 0
  const availableMushroom = city?.mushroom ?? outpost?.mushroom ?? 0

  const selectedTroopList = useMemo(() => {
    return Object.keys(selectedTroops).reduce((acc, key) => {
      const code = key as TroopCode
      const count = selectedTroops[code] ?? 0
      if (count > 0) {
        return [ ...acc, { code, count } ]
      }
      return acc
    }, new Array<{ code: TroopCode; count: number }>())
  }, [selectedTroops])

  const capacity = estimation.transport_capacity ?? 0
  const usedCapacity = resources.plastic + resources.mushroom
  const remainingCapacity = Math.max(0, capacity - usedCapacity)
  const maxPlastic = Math.min(availablePlastic, resources.plastic + remainingCapacity)
  const maxMushroom = Math.min(availableMushroom, resources.mushroom + remainingCapacity)

  useEffect(() => {
    launchMovementEstimation()
  }, [selectedTroops, destination])

  useEffect(() => {
    setResources(current => {
      const nextPlastic = Math.min(current.plastic, maxPlastic)
      const nextMushroom = Math.min(current.mushroom, maxMushroom)
      if (nextPlastic === current.plastic && nextMushroom === current.mushroom) {
        return current
      }
      return {
        plastic: nextPlastic,
        mushroom: nextMushroom,
      }
    })
  }, [maxPlastic, maxMushroom])

  const launchMovementEstimation = async () => {
    if (!token) return

    const origin = cityCoordinates ?? outpostCoordinates
    if (!origin) return

    const troopCodes: TroopCode[] = selectedTroopList.map(troop => troop.code)

    if (!troopCodes.length) return

    const result = await estimateMovement({
      token,
      origin,
      destination,
      troopCodes,
      troops: selectedTroopList,
    })
    if (!result) {
      setEstimation({
        speed: 0,
        duration: 0,
        distance: 0,
        transport_capacity: 0,
      })
      return
    }

    setEstimation(result)
  }

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const origin = cityCoordinates ?? outpostCoordinates
    if (!origin) return

    if (!selectedTroopList.length) return

    createMovement.mutate({
      action,
      origin,
      destination,
      troops: selectedTroopList,
      resources: action === MovementAction.TRANSPORT ? resources : undefined,
    })
  }

  const canSubmit = Boolean(estimation.distance)
    && (action !== MovementAction.TRANSPORT || usedCapacity > 0)

  return (
    <form
      id="movement-creation"
      className="movement-create-form"
      onSubmit={event => onSubmit(event)}
    >
      <section className="movement-panel movement-panel--create">
        <h2 className="movement-panel__title">Nouveau déplacement</h2>
        <p className="movement-panel__lede">
          Choisissez les troupes, l&apos;ordre et la case cible : l&apos;estimation se met à jour
          automatiquement avant l&apos;envoi.
        </p>
        <div className="movement-create-grid">
          <div id="troop-selection" className="movement-create-grid__col movement-create-grid__col--troops">
            <h3 className="movement-subsection__title">Troupes à envoyer</h3>
            <MovementCreateTroops
              troops={troops}
              selectedTroops={selectedTroops}
              onChange={setSelectedTroops}
            />
          </div>
          <div id="movement-submit" className="movement-create-grid__col movement-create-grid__col--config">
            <div className="movement-config-stack">
              <MovementCreateAction action={action} onChange={setAction} />
              {action === MovementAction.TRANSPORT && (
                <MovementCreateResources
                  plastic={resources.plastic}
                  mushroom={resources.mushroom}
                  maxPlastic={maxPlastic}
                  maxMushroom={maxMushroom}
                  capacity={capacity}
                  usedCapacity={usedCapacity}
                  onChange={setResources}
                />
              )}
              <MovementCreateDestination
                destination={destination}
                onChange={setDestination}
                excludeCityId={cityId}
                excludeOutpostId={outpostId}
              />
              <MovementCreateEstimation estimation={estimation} />
            </div>
          </div>
        </div>
        <div className="movement-submit-footer">
          <MovementCreateWarning
            isTemporaryOutpost={Boolean(outpost?.type === OutpostType.TEMPORARY)}
            troops={troops}
            selectedTroops={selectedTroops}
          />
          <input
            className="movement-submit-button"
            disabled={!canSubmit}
            type="submit"
            value="Envoyer le déplacement"
          />
        </div>
      </section>
    </form>
  )
}

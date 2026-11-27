import React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { MovementAction } from '@eoneom/api-client'

import { formatCoordinates } from '#helpers/transform'
import { Button } from '#ui/button'
import { TroopTranslations } from '#troop/translations'
import { useCreateMovement } from '#troop/hooks'
import { useGetCity } from '#city/hooks'
import { allianceKeys, useCityReinforcements, useReinforcementsAbroad } from '#alliance/hooks'

const sectionTitleClass = 'm-0 text-sm uppercase tracking-wider text-label'

const TroopLine: React.FC<{ troops: { code: keyof typeof TroopTranslations; count: number }[] }> = ({ troops }) => (
  <p className="m-0 text-xs text-amber-dim">
    {troops.map(troop => `${TroopTranslations[troop.code].name} × ${troop.count}`).join(', ')}
  </p>
)

/** Allied troops stationed in the city: read only for the host (slice 033). */
export const StationedReinforcements: React.FC<{ cityId: string }> = ({ cityId }) => {
  const { data: reinforcements = [] } = useCityReinforcements(cityId)

  if (reinforcements.length === 0) return null

  return (
    <section className="space-y-2">
      <h3 className={sectionTitleClass}>Renforts stationnés</h3>
      <p className="m-0 text-xs text-label">
        Ces troupes alliées défendent la ville avec votre garnison. Seul leur propriétaire peut les rappeler.
      </p>
      <ul className="m-0 list-none space-y-2 p-0">
        {reinforcements.map(reinforcement => (
          <li key={reinforcement.owner.id} className="rounded-sm border border-rust/30 p-2">
            <div className="text-sm text-amber">{reinforcement.owner.name}</div>
            <TroopLine troops={reinforcement.troops} />
          </li>
        ))}
      </ul>
    </section>
  )
}

/** The player's troops stationed in allied cities, recalled to the current city (slice 033). */
export const ReinforcementsAbroad: React.FC<{ cityId: string }> = ({ cityId }) => {
  const queryClient = useQueryClient()
  const { data: city } = useGetCity(cityId)
  const { data: reinforcements = [] } = useReinforcementsAbroad()
  const createMovement = useCreateMovement()

  if (reinforcements.length === 0) return null

  return (
    <section className="space-y-2">
      <h3 className={sectionTitleClass}>Vos renforts à l&apos;étranger</h3>
      <ul className="m-0 list-none space-y-2 p-0">
        {reinforcements.map(reinforcement => (
          <li key={reinforcement.city.id} className="flex items-center justify-between gap-2 rounded-sm border border-rust/30 p-2">
            <div>
              <div className="text-sm text-amber">
                {reinforcement.city.name} ({formatCoordinates(reinforcement.city.coordinates)}) — {reinforcement.host.name}
              </div>
              <TroopLine troops={reinforcement.troops} />
            </div>
            <Button
              variant="ghost"
              disabled={!city || createMovement.isPending}
              onClick={() => {
                if (!city) return
                createMovement.mutate({
                  action: MovementAction.BASE,
                  origin: reinforcement.city.coordinates,
                  destination: city.coordinates,
                  troops: reinforcement.troops,
                }, {
                  onSuccess: () => queryClient.invalidateQueries({ queryKey: allianceKeys.reinforcementsAbroad }),
                })
              }}
            >
              Rappeler
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}

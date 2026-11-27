import React, { useMemo } from 'react'
import { TroopCode } from '@eoneom/api-client'

import { useGetCity } from '#city/hooks'
import { unmetRequirementName, useRequirementEvaluator } from '#requirement/hook'
import { groupByTroopRole, TroopGroupLabels } from '#troop/group'
import { useCityRecruitQueue, useListCityTroops, useListOutpostTroops } from '#troop/hooks'
import { troopImageSrc } from '#troop/image'
import { TroopListInProgress } from '#troop/list/in-progress'
import { TroopTranslations } from '#troop/translations'
import { TroopItem } from '#types'
import { CatalogueCardData } from '#ui/catalogue/card'
import { catalogueCityResources, catalogueStock } from '#ui/catalogue/city'
import { useCatalogueCountdown } from '#ui/catalogue/countdown'
import { CatalogueGrid } from '#ui/catalogue/grid'
import { catalogueCardState } from '#ui/catalogue/state'

const reservedLine = (troop: TroopItem): React.ReactNode => troop.exchange_reserved > 0
  ? <p className="m-0 text-caption text-label">dont {troop.exchange_reserved} réservés</p>
  : undefined

const troopGroups = (troops: TroopItem[], card: (troop: TroopItem) => CatalogueCardData) =>
  groupByTroopRole(troops).map(({ group, items }) => ({
    id: group,
    title: TroopGroupLabels[group],
    cards: items.map(card),
  }))

interface Props {
  cityId: string
  selectedCode: TroopCode | null
  onSelect: (code: TroopCode) => void
}

/** City troop catalogue (slice 043): recruitment queue, then cards grouped by role. */
export const TroopList: React.FC<Props> = ({ cityId, selectedCode, onSelect }) => {
  const { data: troops = [] } = useListCityTroops(cityId)
  const { data: recruitQueue } = useCityRecruitQueue(cityId)
  const { data: city } = useGetCity(cityId)
  const evaluate = useRequirementEvaluator(cityId)

  const inProgress = troops.find(troop => troop.ongoing_recruitment)
  const countdown = useCatalogueCountdown(
    inProgress?.ongoing_recruitment?.started_at,
    inProgress?.ongoing_recruitment?.finish_at
  )

  const groups = useMemo(() => {
    const queue = recruitQueue?.queue ?? []
    const limit = recruitQueue?.limit ?? 0
    return troopGroups(troops, (troop): CatalogueCardData => {
      const recruitment = troop.ongoing_recruitment
      const queuedCount = queue.filter(item => item.troop_code === troop.code).length
      return {
        code: troop.code,
        name: TroopTranslations[troop.code].name,
        image: troopImageSrc(troop.code),
        amount: { kind: 'count', value: troop.count },
        extra: reservedLine(troop),
        cost: { target_label: '▸ × 1', ...troop.cost },
        stock: catalogueStock(city),
        state: catalogueCardState({
          catalogue: 'troop',
          in_progress: recruitment ? { remaining_units: recruitment.remaining_count } : undefined,
          queued: { count: queuedCount },
          unmet_requirements: evaluate(troop.requirement).map(unmet => ({
            name: unmetRequirementName(unmet),
            level: unmet.level,
          })),
          queue: { active: inProgress !== undefined, length: queue.length, limit },
          cost: troop.cost,
          city: catalogueCityResources(city),
        }),
        progress: recruitment && countdown ? { elapsed: countdown.elapsed } : undefined,
      }
    })
  }, [troops, recruitQueue, city, evaluate, inProgress, countdown])

  return (
    <CatalogueGrid
      scope="troop"
      groups={groups}
      selectedCode={selectedCode}
      onSelect={code => onSelect(code as TroopCode)}
      queue={<TroopListInProgress cityId={cityId} />}
      absentFilterDefault={false}
    />
  )
}

interface OutpostProps {
  outpostId: string
  selectedCode: TroopCode | null
  onSelect: (code: TroopCode) => void
}

/** Read-only troop grid of an outpost (slice 043): counts only, no cost, no badge. */
export const OutpostTroopList: React.FC<OutpostProps> = ({ outpostId, selectedCode, onSelect }) => {
  const { data: troops = [] } = useListOutpostTroops(outpostId)

  const groups = useMemo(() => troopGroups(troops, (troop): CatalogueCardData => ({
    code: troop.code,
    name: TroopTranslations[troop.code].name,
    image: troopImageSrc(troop.code),
    amount: { kind: 'count', value: troop.count },
    state: { kind: 'none' },
  })), [troops])

  return (
    <CatalogueGrid
      scope="outpost_troop"
      groups={groups}
      selectedCode={selectedCode}
      onSelect={code => onSelect(code as TroopCode)}
      absentFilterDefault
      lockedFilter={false}
    />
  )
}

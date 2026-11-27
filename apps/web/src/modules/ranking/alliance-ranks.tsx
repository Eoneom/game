import React from 'react'
import { Link } from '@tanstack/react-router'
import { RankingCategory, RankingKind } from '@eoneom/api-client'

import { useRankingMe } from '#ranking/hooks'
import { RankingCategoryLabels, formatPoints, formatRankChange } from '#ranking/translations'

const AnyLink = Link as React.ComponentType<{
  to: string
  search?: Record<string, string | number>
  className?: string
  children: React.ReactNode
}>

/** The caller's alliance ranks per category (slice 034); hidden until the alliance is ranked (3 members or more). */
export const AllianceRanks: React.FC<{ allianceId: string }> = ({ allianceId }) => {
  const { data } = useRankingMe()
  const positions = (data?.positions ?? []).filter(
    position => position.kind === RankingKind.ALLIANCE && position.entity_id === allianceId
  )

  if (positions.length === 0) return null

  return (
    <section className="space-y-2" aria-label="Classement de l'alliance">
      <h3 className="m-0 text-sm uppercase tracking-wider text-label">Classement</h3>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {Object.values(RankingCategory).map(category => {
          const position = positions.find(candidate => candidate.category === category)
          if (!position) return null
          return (
            <li key={category}>
              <AnyLink
                to="/ranking"
                search={{ category, kind: RankingKind.ALLIANCE, page: position.page }}
                className="block rounded-sm border border-rust/30 px-2 py-1 text-sm text-amber-dim hover:border-amber/50 hover:text-amber"
              >
                {RankingCategoryLabels[category]} : <span className="text-amber">{position.rank}</span>
                {position.rank_change_24h !== null && position.rank_change_24h !== 0 && (
                  <span className="ml-1 text-xs">{formatRankChange(position.rank_change_24h)}</span>
                )}
                <span className="ml-1 text-xs text-label">({formatPoints(position.points)} pts)</span>
              </AnyLink>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

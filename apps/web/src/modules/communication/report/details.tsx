import { ReportType } from '@eoneom/api-client'
import { Report } from '#types'
import { TroopTranslations } from '#troop/translations'
import { troopImageSrc } from '#troop/image'
import React from 'react'
import { LayoutDetailsContent } from '#ui/layout/details/content'
import { formatCoordinates } from '#helpers/transform'
import { CombatStrategyLabels } from '#movement/translations'
import { ReportTypeLabels } from '#communication/report/translations'

interface Props {
  report?: Report
}

const hasResources = (resources: { plastic: number; mushroom: number; plasma: number }) =>
  resources.plastic > 0 || resources.mushroom > 0 || resources.plasma > 0

const formatResources = (resources: { plastic: number; mushroom: number; plasma: number }) => {
  const parts = [
    resources.plastic > 0 ? `${resources.plastic} plastique` : null,
    resources.mushroom > 0 ? `${resources.mushroom} champignon` : null,
    resources.plasma > 0 ? `${resources.plasma} plasma` : null,
  ].filter(Boolean)
  return parts.join(', ')
}

const winnerLabel = (winner: string) => {
  if (winner === 'attacker') return 'Attaquant'
  if (winner === 'defender') return 'Défenseur'
  return 'Match nul'
}

export const ReportDetails: React.FC<Props> = ({ report }) => {
  if (!report) {
    return null
  }

  if (report.type === ReportType.BATTLE && report.battle) {
    const battle = report.battle
    return (
      <LayoutDetailsContent>
        <h1>{ReportTypeLabels[report.type]}</h1>
        <p className="details-meta">
          {formatCoordinates(report.origin)} → {formatCoordinates(report.destination)}
        </p>
        <p className="details-meta">Résultat : {winnerLabel(battle.winner)}</p>
        <p className="details-meta">
          Stratégies — attaquant : {CombatStrategyLabels[battle.attacker_strategy]} ;
          défenseur : {CombatStrategyLabels[battle.defender_strategy]}
        </p>
        {hasResources(report.resources) && (
          <p className="details-meta">Butin : {formatResources(report.resources)}</p>
        )}
        <h3>Pertes (votre camp)</h3>
        <ul>
          {report.troops.map(troop => (
            <li key={troop.code} className="flex items-center gap-2">
              <img
                src={troopImageSrc(troop.code)}
                alt={TroopTranslations[troop.code].name}
                className="h-8 w-8"
              />
              {TroopTranslations[troop.code].name} × {troop.count}
            </li>
          ))}
        </ul>
        <h3>Tours ({battle.rounds_played})</h3>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>Tour</th>
              <th>Att. (attaque / vie)</th>
              <th>Déf. (attaque / vie)</th>
            </tr>
          </thead>
          <tbody>
            {battle.round_summaries.map(row => (
              <tr key={row.round}>
                <td>{row.round}</td>
                <td>{row.attacker_attack_pool} / {row.attacker_life_pool}</td>
                <td>{row.defender_attack_pool} / {row.defender_life_pool}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="mt-4 text-sm text-amber-dim">
          {battle.outcome.occupied && <li>Occupation réussie</li>}
          {battle.outcome.loot_applied && <li>Butin prélevé</li>}
          {battle.outcome.destroyed_temp_outpost && <li>Avant-poste temporaire détruit</li>}
          {battle.outcome.attacker_retreated && <li>Retraite de l&apos;attaquant</li>}
        </ul>
      </LayoutDetailsContent>
    )
  }

  return <LayoutDetailsContent>
    <h1>{ReportTypeLabels[report.type]}</h1>
    <h3>Source: {formatCoordinates(report.origin)}</h3>
    <h3>Destination: {formatCoordinates(report.destination)}</h3>
    {hasResources(report.resources) && (
      <p className="details-meta">
        Ressources transportées : {formatResources(report.resources)}
      </p>
    )}
    {hasResources(report.remaining_resources) && (
      <p className="details-meta">
        Ressources restantes renvoyées à l&apos;origine : {formatResources(report.remaining_resources)}
      </p>
    )}
    <h3>Troupes</h3>
    <ul>
      {
        report.troops.map(troop => <li key={troop.code}>
          {TroopTranslations[troop.code].name} {troop.count}
        </li>)
      }
    </ul>
  </LayoutDetailsContent>
}

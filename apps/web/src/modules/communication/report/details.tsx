import { ReportType } from '@eoneom/api-client'
import { Report } from '#types'
import { TroopTranslations } from '#troop/translations'
import { troopImageSrc } from '#troop/image'
import React from 'react'
import { LayoutDetailsContent } from '#ui/layout/details/content'
import { formatCoordinates } from '#helpers/transform'
import { CombatStrategyLabels } from '#movement/translations'
import {
  defenseLosses,
  formatCombatModifiers,
  formatShieldReduction,
  ReportTypeLabels,
} from '#communication/report/translations'
import { DefenseTranslations } from '#defense/translations'
import { defenseImageSrc } from '#defense/image'
import { SpyDetectedReportDetails, SpyReportDetails } from '#communication/report/spy-details'

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

  if (report.type === ReportType.SPY && report.spy) {
    return <SpyReportDetails report={report} spy={report.spy} />
  }

  if (report.type === ReportType.SPY_DETECTED && report.spy_detected) {
    return <SpyDetectedReportDetails report={report} spyDetected={report.spy_detected} />
  }

  if (report.type === ReportType.BATTLE && report.battle) {
    const battle = report.battle
    const attacker_modifiers = formatCombatModifiers(battle.attacker_modifiers)
    const defender_modifiers = formatCombatModifiers(battle.defender_modifiers)
    const destroyed_defenses = defenseLosses(battle.casualties_defender)
    const has_plasma = battle.round_summaries.some(row => (row.defender_plasma_spent ?? 0) > 0)
    const has_shield = battle.round_summaries.some(row => (row.shield_reduction ?? 0) > 0)
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
        {(attacker_modifiers || defender_modifiers) && (
          <p className="details-meta">
            Technologies — attaquant : {attacker_modifiers ?? 'aucune'} ;
            défenseur : {defender_modifiers ?? 'aucune'}
          </p>
        )}
        {hasResources(report.resources) && (
          <p className="details-meta">Butin : {formatResources(report.resources)}</p>
        )}
        {battle.perspective === 'defender' && battle.sheltered && hasResources(battle.sheltered) && (
          <p className="details-meta">Protégé par l&apos;abri : {formatResources(battle.sheltered)}</p>
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
        {destroyed_defenses.length > 0 && (
          <>
            <h3>{battle.perspective === 'defender' ? 'Défenses détruites' : 'Défenses ennemies détruites'}</h3>
            <ul>
              {destroyed_defenses.map(defense => (
                <li key={defense.code} className="flex items-center gap-2">
                  <img
                    src={defenseImageSrc(defense.code)}
                    alt={DefenseTranslations[defense.code].name}
                    className="h-8 w-8"
                  />
                  {DefenseTranslations[defense.code].name} × {defense.count}
                </li>
              ))}
            </ul>
          </>
        )}
        <h3>Tours ({battle.rounds_played})</h3>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>Tour</th>
              <th>Att. (attaque / vie)</th>
              <th>Déf. (attaque / vie)</th>
              {has_plasma && <th>Plasma dépensé</th>}
              {has_shield && <th>Bouclier</th>}
            </tr>
          </thead>
          <tbody>
            {battle.round_summaries.map(row => (
              <tr key={row.round}>
                <td>{row.round}</td>
                <td>{row.attacker_attack_pool} / {row.attacker_life_pool}</td>
                <td>{row.defender_attack_pool} / {row.defender_life_pool}</td>
                {has_plasma && <td>{row.defender_plasma_spent ?? 0}</td>}
                {has_shield && <td>{formatShieldReduction(row.shield_reduction) ?? '—'}</td>}
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

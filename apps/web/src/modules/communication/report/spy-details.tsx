import React from 'react'
import { ReportSpyDetectedMetadata, ReportSpyMetadata } from '@eoneom/api-client'

import { Report } from '#types'
import { LayoutDetailsContent } from '#ui/layout/details/content'
import { formatCoordinates } from '#helpers/transform'
import { TroopTranslations } from '#troop/translations'
import { troopImageSrc } from '#troop/image'
import { DefenseTranslations } from '#defense/translations'
import { defenseImageSrc } from '#defense/image'
import { BuildingTranslations } from '#building/translations'
import { TechnologyTranslations } from '#technology/translations'
import { FactionTranslations } from '#faction/translations'
import { CombatStrategyLabels } from '#movement/translations'
import { ReportTypeLabels } from '#communication/report/translations'
import {
  formatSpyRoll,
  formatSpyTarget,
  OutpostTypeLabels,
  spyOutcomeLabel,
} from '#communication/report/spy-translations'

const SpyIntel: React.FC<{ spy: ReportSpyMetadata }> = ({ spy }) => (
  <>
    {spy.troops && (
      <>
        <h3>Troupes sur place</h3>
        {spy.troops.length ? (
          <ul>
            {spy.troops.map(troop => (
              <li key={troop.code} className="flex items-center gap-2">
                <img src={troopImageSrc(troop.code)} alt={TroopTranslations[troop.code].name} className="h-8 w-8" />
                {TroopTranslations[troop.code].name} × {troop.count}
              </li>
            ))}
          </ul>
        ) : <p className="details-meta">Aucune troupe</p>}
      </>
    )}
    {spy.defenses && (
      <>
        <h3>Défenses</h3>
        {spy.defenses.length ? (
          <ul>
            {spy.defenses.map(defense => (
              <li key={defense.code} className="flex items-center gap-2">
                <img src={defenseImageSrc(defense.code)} alt={DefenseTranslations[defense.code].name} className="h-8 w-8" />
                {DefenseTranslations[defense.code].name} × {defense.count}
              </li>
            ))}
          </ul>
        ) : <p className="details-meta">Aucune défense</p>}
      </>
    )}
    {spy.default_strategy && (
      <p className="details-meta">Stratégie de la garnison : {CombatStrategyLabels[spy.default_strategy]}</p>
    )}
    {spy.resources && (
      <p className="details-meta">
        Stock : {spy.resources.plastic} plastique, {spy.resources.mushroom} champignon, {spy.resources.plasma} plasma, {spy.resources.water ?? 0} eau pure
      </p>
    )}
    {spy.outpost_type && (
      <p className="details-meta">Type d&apos;avant-poste : {OutpostTypeLabels[spy.outpost_type]}</p>
    )}
    {spy.buildings && (
      <>
        <h3>Bâtiments</h3>
        <ul>
          {spy.buildings.map(building => (
            <li key={building.code}>{BuildingTranslations[building.code].name} — niveau {building.level}</li>
          ))}
        </ul>
      </>
    )}
    {spy.technologies && (
      <>
        <h3>Technologies</h3>
        {spy.technologies.length ? (
          <ul>
            {spy.technologies.map(technology => (
              <li key={technology.code}>{TechnologyTranslations[technology.code].name} — niveau {technology.level}</li>
            ))}
          </ul>
        ) : <p className="details-meta">Aucune technologie</p>}
      </>
    )}
  </>
)

export const SpyReportDetails: React.FC<{ report: Report, spy: ReportSpyMetadata }> = ({ report, spy }) => {
  const roll = formatSpyRoll(spy)
  return (
    <LayoutDetailsContent>
      <h1>{ReportTypeLabels[report.type]}</h1>
      <p className="details-meta">
        {formatCoordinates(report.origin)} → {formatCoordinates(report.destination)}
      </p>
      <p className="details-meta">Cible : {formatSpyTarget(spy.target)}</p>
      <p className="details-meta">Résultat : {spyOutcomeLabel(spy)}</p>
      {roll && <p className="details-meta">{roll}</p>}
      {spy.scouts_lost > 0 && <p className="details-meta">Éclaireurs perdus : {spy.scouts_lost}</p>}
      {spy.success && <SpyIntel spy={spy} />}
    </LayoutDetailsContent>
  )
}

export const SpyDetectedReportDetails: React.FC<{ report: Report, spyDetected: ReportSpyDetectedMetadata }> = ({
  report,
  spyDetected,
}) => (
  <LayoutDetailsContent>
    <h1>{ReportTypeLabels[report.type]}</h1>
    <p className="details-meta">
      Espion : {spyDetected.spy_owner.name} ({FactionTranslations[spyDetected.spy_owner.faction_code].name})
    </p>
    <p className="details-meta">Lieu visé : {formatSpyTarget(spyDetected.target)}</p>
    <p className="details-meta">Éclaireurs ennemis détruits : {spyDetected.scouts_destroyed}</p>
  </LayoutDetailsContent>
)

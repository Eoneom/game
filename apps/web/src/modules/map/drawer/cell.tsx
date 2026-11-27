import React from 'react'
import { Link } from '@tanstack/react-router'
import { Coordinates, WorldMarkerCity, WorldMarkerOutpost, WorldTargetIntel } from '@eoneom/api-client'

import { allianceDisplayName } from '#alliance/translations'
import { FactionTranslations } from '#faction/translations'
import { RELATION_NAMES, TerrainChar, terrainLabel } from '#map/helper'
import { outpostLabel } from '#map/markers'
import {
  ExploredCell,
  TERRAIN_METRIC_LABELS,
  formatCoefficient,
  terrainBin,
  terrainBinLabel,
  terrainValue,
} from '#map/overlays'
import { TerrainMetric } from '#map/search'
import { MapCellAction } from '#map/cell-menu'
import { IntelSummary, NO_REPORT } from '#map/drawer/targets'

interface Props {
  coordinates: Coordinates
  terrain: TerrainChar | undefined
  explored: ExploredCell | undefined
  /** Active « Bonus de terrain » metric, to show the cell's bin. */
  metric: TerrainMetric | null
  city: WorldMarkerCity | null
  outpost: WorldMarkerOutpost | null
  /** Spy summary of an enemy or system settlement: `undefined` while loading or not applicable. */
  intel: WorldTargetIntel | null | undefined
  attack: number
  now: number
  actions: MapCellAction[]
  notice?: string
  onAction: (action: MapCellAction) => void
}

const SettlementBlock: React.FC<{ city: WorldMarkerCity | null; outpost: WorldMarkerOutpost | null }> = ({ city, outpost }) => {
  const marker = city ?? outpost
  if (!marker) return null
  const name = city ? city.name : outpostLabel((outpost as WorldMarkerOutpost).type)
  return (
    <div className="details-block space-y-1">
      <p className="m-0 text-title text-ink">{allianceDisplayName(name, marker.alliance_tag)}</p>
      <p className="m-0 text-meta text-label">
        {allianceDisplayName(marker.owner_name, marker.alliance_tag)} · {FactionTranslations[marker.faction_code].name}
      </p>
      <p className="m-0 text-meta text-label">Relation : <span className="text-ink">{RELATION_NAMES[marker.relation]}</span></p>
      {city && outpost && <p className="m-0 text-meta text-label">Avec {outpostLabel(outpost.type).toLowerCase()} sur la case.</p>}
    </div>
  )
}

/** Selected cell in the drawer (slice 044): terrain, coefficients, settlement, intel and the allowed actions. */
export const MapDrawerCell: React.FC<Props> = ({
  coordinates,
  terrain,
  explored,
  metric,
  city,
  outpost,
  intel,
  attack,
  now,
  actions,
  notice,
  onAction,
}) => {
  const relation = (city ?? outpost)?.relation
  const hostile = relation === 'enemy' || relation === 'system'

  return (
    <div className="space-y-3">
      <p className="m-0 text-meta text-label">
        Case <span className="font-mono tabular-nums text-ink">({coordinates.x}, {coordinates.y})</span> · {terrainLabel(terrain)}
      </p>

      <SettlementBlock city={city} outpost={outpost} />

      {explored ? (
        <div className="details-block">
          <h3 className="m-0 field-label">Coefficients de la cellule</h3>
          <ul className="m-0 list-none space-y-1 p-0 text-body text-ink">
            <li>Plastique : <span className="font-mono tabular-nums">{formatCoefficient(explored.plastic)}</span></li>
            <li>Champignon : <span className="font-mono tabular-nums">{formatCoefficient(explored.mushroom)}</span></li>
            <li>Solaire : <span className="font-mono tabular-nums">{formatCoefficient(explored.solar)}</span></li>
          </ul>
          {metric && (
            <p className="m-0 mt-1 text-meta text-label">
              {TERRAIN_METRIC_LABELS[metric]} : classe {terrainBinLabel(terrainBin(terrainValue(explored, metric)))}
            </p>
          )}
        </div>
      ) : (
        <p className="m-0 text-meta text-label">Case inexplorée : coefficients inconnus.</p>
      )}

      {hostile && (
        <div className="details-block">
          <h3 className="m-0 field-label">Renseignement</h3>
          {intel === undefined && <p className="m-0 text-meta text-label">Chargement…</p>}
          {intel === null && <p className="m-0 text-meta text-label">{NO_REPORT}</p>}
          {intel && (
            <>
              <IntelSummary intel={intel} attack={attack} now={now} />
              <Link to="/inbox/report" search={{ report_id: intel.report_id }} className="text-meta">Voir le rapport</Link>
            </>
          )}
        </div>
      )}

      {(actions.length > 0 || notice) && (
        <div className="space-y-2 border-t border-rust/40 pt-3">
          {actions.map(action => (
            <div key={action.key}>
              <button
                type="button"
                className="w-full cursor-pointer rounded-sm border border-copper bg-copper/30 px-3 py-2 text-left text-meta font-semibold uppercase tracking-wide text-amber hover:bg-copper/50 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={Boolean(action.disabledReason)}
                onClick={() => onAction(action)}
              >
                {action.label}
              </button>
              {action.disabledReason && <p className="m-0 mt-1 text-caption text-label">{action.disabledReason}</p>}
            </div>
          ))}
          {notice && <p className="m-0 text-meta text-label">{notice}</p>}
        </div>
      )}
    </div>
  )
}

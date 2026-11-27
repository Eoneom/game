import React from 'react'
import { Coordinates, WorldTargetIntel } from '@eoneom/api-client'

import { allianceDisplayName } from '#alliance/translations'
import { FactionTranslations } from '#faction/translations'
import { MovementActionLabels } from '#movement/translations'
import { RELATION_NAMES, TerrainChar, terrainLabel } from '#map/helper'
import { ScreenMarker, outpostLabel } from '#map/markers'
import { MapArrow, formatCountdown } from '#map/movements'
import { ExploredCell, formatCoefficient, formatReportAge } from '#map/overlays'

export type MapHoverTarget =
  | { kind: 'cell'; coordinates: Coordinates }
  | { kind: 'marker'; coordinates: Coordinates; marker: ScreenMarker }
  | { kind: 'movement'; coordinates: Coordinates; arrow: MapArrow }

interface Props {
  target: MapHoverTarget
  /** Stage pixel the card is anchored to (top-right corner of the cell). */
  anchor: { x: number; y: number }
  stage: { width: number; height: number }
  terrain: TerrainChar | undefined
  explored: ExploredCell | undefined
  /** Spy report of the hovered settlement, while the targets overlay is on. */
  intel: WorldTargetIntel | null | undefined
  now: number
}

const CARD_WIDTH = 256

/** HTML tooltip of the map (slice 044): settlement, movement or empty cell. */
export const MapHoverCard: React.FC<Props> = ({ target, anchor, stage, terrain, explored, intel, now }) => {
  const left = anchor.x + 8 + CARD_WIDTH > stage.width ? Math.max(0, anchor.x - CARD_WIDTH - 8) : anchor.x + 8
  const top = Math.max(0, Math.min(anchor.y, stage.height - 140))
  const coordinates = `(${target.coordinates.x}, ${target.coordinates.y})`

  let content: React.ReactNode
  if (target.kind === 'marker') {
    const { marker } = target
    const name = marker.kind === 'city' ? marker.marker.name : outpostLabel(marker.marker.type)
    content = (
      <>
        <p className="m-0 text-body font-semibold text-ink">{allianceDisplayName(name, marker.marker.alliance_tag)}</p>
        <p className="m-0">{allianceDisplayName(marker.marker.owner_name, marker.marker.alliance_tag)}</p>
        <p className="m-0">{FactionTranslations[marker.marker.faction_code].name} · {RELATION_NAMES[marker.relation]}</p>
        <p className="m-0 font-mono tabular-nums">{coordinates}</p>
        {intel !== undefined && (
          <p className="m-0">{intel ? `Rapport d'espionnage : il y a ${formatReportAge(intel.recorded_at, now)}` : 'Aucun rapport d\'espionnage'}</p>
        )}
      </>
    )
  } else if (target.kind === 'movement') {
    const { arrow } = target
    const label = arrow.style === 'incoming' ? 'Attaque entrante' : MovementActionLabels[arrow.style]
    content = (
      <>
        <p className="m-0 text-body font-semibold text-ink">{label}</p>
        <p className="m-0">
          ({arrow.origin.x}, {arrow.origin.y}) → ({arrow.destination.x}, {arrow.destination.y})
        </p>
        <p className="m-0 font-mono tabular-nums">
          {arrow.inBattle ? 'En bataille' : `Arrivée dans ${formatCountdown((arrow.arrive_at - now) / 1000)}`}
        </p>
      </>
    )
  } else {
    content = (
      <>
        <p className="m-0 font-mono text-body tabular-nums text-ink">{coordinates}</p>
        <p className="m-0">{terrainLabel(terrain)}</p>
        {explored
          ? <p className="m-0 font-mono tabular-nums">▣ {formatCoefficient(explored.plastic)} · ◍ {formatCoefficient(explored.mushroom)}</p>
          : <p className="m-0">Inexplorée</p>}
      </>
    )
  }

  return (
    <div
      role="tooltip"
      className="map-hover-card pointer-events-none absolute z-10 surface-panel border-edge px-3 py-2 text-meta text-label"
      style={{ left, top, width: CARD_WIDTH }}
    >
      {content}
    </div>
  )
}

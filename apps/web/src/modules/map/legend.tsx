import React, { useState } from 'react'

import { RELATION_ORDER, RELATION_STYLES, movementLegend, terrainLegend } from '#map/helper'
import { TERRAIN_BIN_BOUNDS, TERRAIN_METRIC_LABELS, TERRAIN_RAMPS, terrainBinLabel } from '#map/overlays'
import { MapLayers } from '#map/search'

const SEEN_KEY = 'eoneom.map.legend-seen'

/** Open on the first visit, closed by default afterwards (per browser). */
const readInitialOpen = (): boolean => {
  try {
    const seen = window.localStorage.getItem(SEEN_KEY) === '1'
    window.localStorage.setItem(SEEN_KEY, '1')
    return !seen
  } catch {
    return true
  }
}

const Swatch: React.FC<{ color: string; round?: boolean }> = ({ color, round }) => (
  <span
    aria-hidden
    className={round ? 'inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-black/40' : 'inline-block h-3.5 w-3.5 shrink-0 border border-black/40'}
    style={{ background: color }}
  />
)

interface Props {
  layers: MapLayers
}

/** HTML legend of the map (slice 044): relations, terrain, movements and the active overlay scale. */
export const MapLegend: React.FC<Props> = ({ layers }) => {
  const [ open, setOpen ] = useState(readInitialOpen)

  if (!open) {
    return (
      <button
        type="button"
        className="absolute bottom-2 right-2 z-10 surface-panel border-edge px-3 py-1.5 text-meta text-amber hover:text-ink"
        aria-expanded={false}
        onClick={() => setOpen(true)}
      >
        Légende
      </button>
    )
  }

  return (
    <section aria-label="Légende" className="absolute bottom-2 right-2 z-10 max-h-[70%] w-64 overflow-auto surface-panel border-edge p-3 text-meta text-ink">
      <header className="mb-2 flex items-center justify-between">
        <h2 className="m-0 text-heading text-amber">Légende</h2>
        <button type="button" className="cursor-pointer text-meta text-label hover:text-amber" aria-expanded onClick={() => setOpen(false)}>
          Fermer
        </button>
      </header>
      <ul className="m-0 list-none space-y-1 p-0">
        {RELATION_ORDER.map(relation => (
          <li key={relation} className="flex items-center gap-2">
            <Swatch color={RELATION_STYLES[relation].fill} round />
            {RELATION_STYLES[relation].label}
          </li>
        ))}
      </ul>
      <p className="m-0 mt-1 text-caption text-label">Taille : niveau total des bâtiments. ◆ avant-poste, ◇ camp temporaire.</p>
      <h3 className="m-0 mt-3 text-meta font-semibold text-label">Terrain</h3>
      <ul className="m-0 list-none space-y-1 p-0">
        {terrainLegend.map(entry => (
          <li key={entry.key} className="flex items-center gap-2"><Swatch color={entry.color} />{entry.label}</li>
        ))}
      </ul>
      {layers.movements && (
        <>
          <h3 className="m-0 mt-3 text-meta font-semibold text-label">Mouvements</h3>
          <ul className="m-0 list-none space-y-1 p-0">
            {movementLegend.map(entry => (
              <li key={entry.key} className="flex items-center gap-2">
                <svg aria-hidden width="28" height="8" className="shrink-0">
                  <line x1="1" y1="4" x2="27" y2="4" stroke={entry.style.color} strokeWidth={entry.style.width} strokeDasharray={entry.style.dash.join(' ')} />
                </svg>
                {entry.label}
              </li>
            ))}
          </ul>
        </>
      )}
      {layers.terrain && (
        <>
          <h3 className="m-0 mt-3 text-meta font-semibold text-label">Bonus de terrain — {TERRAIN_METRIC_LABELS[layers.terrain]}</h3>
          <ul className="m-0 list-none space-y-1 p-0">
            {TERRAIN_RAMPS[layers.terrain].map((color, bin) => (
              <li key={color} className="flex items-center gap-2"><Swatch color={color} />{terrainBinLabel(bin)}</li>
            ))}
          </ul>
          <p className="m-0 mt-1 text-caption text-label">
            Cases explorées seulement (×{String(TERRAIN_BIN_BOUNDS[0]).replace('.', ',')} … ×{String(TERRAIN_BIN_BOUNDS[TERRAIN_BIN_BOUNDS.length - 1]).replace('.', ',')}); hachures : inexplorée.
          </p>
        </>
      )}
      {layers.targets && (
        <>
          <h3 className="m-0 mt-3 text-meta font-semibold text-label">Cibles et menaces</h3>
          <ul className="m-0 list-none space-y-1 p-0">
            <li>⊕ Cible (système, avant-poste ennemi)</li>
            <li className="text-danger">◌ Menace (ville ennemie)</li>
            <li>? Aucun rapport d'espionnage</li>
            <li>Âge du rapport : plein &lt; 6 h, estompé 6–24 h, contour &gt; 24 h</li>
          </ul>
        </>
      )}
    </section>
  )
}

import React, { useEffect, useState } from 'react'
import classNames from 'classnames'
import { Coordinates, WORLD_SIZE } from '@eoneom/api-client'

import { MAX_ZOOM_LEVEL, MIN_ZOOM_LEVEL, MapZoomLevel } from '#map/viewport'
import { MapLayers, TERRAIN_METRICS, TerrainMetric } from '#map/search'
import { TERRAIN_METRIC_LABELS } from '#map/overlays'

const GO_TO_RANGE_ERROR = 'Coordonnées entre 1 et 100'

export interface MapLocationOption {
  key: string
  label: string
  coordinates: Coordinates
}

interface Props {
  zoom: MapZoomLevel
  rows: number
  columns: number
  onZoom: (level: number) => void
  onGoTo: (coordinates: Coordinates) => void
  locations: MapLocationOption[]
  onRecenter: (() => void) | null
  layers: MapLayers
  onLayersChange: (layers: MapLayers) => void
  /** Shown while the targets overlay is on and the drawer shows something else. */
  onShowTargets: (() => void) | null
  /** Current centre cell, prefilled in « Aller à ». */
  center: Coordinates
}

const buttonClass = 'cursor-pointer rounded-sm border border-rust/60 bg-chrome-2 px-2.5 py-1 text-meta text-amber transition hover:border-amber/60 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40'

const parseCoordinate = (value: string): number | null => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= WORLD_SIZE ? parsed : null
}

/** Zoom steps, « Aller à », « Mes emplacements », « Recentrer » and the layer toggles (slice 044). */
export const MapToolbar: React.FC<Props> = ({
  zoom,
  rows,
  columns,
  onZoom,
  onGoTo,
  locations,
  onRecenter,
  layers,
  onLayersChange,
  onShowTargets,
  center,
}) => {
  const [ x, setX ] = useState(String(center.x))
  const [ y, setY ] = useState(String(center.y))
  const [ error, setError ] = useState<string | null>(null)
  const [ editing, setEditing ] = useState(false)

  // Follow the map while the player is not typing.
  useEffect(() => {
    if (editing) return
    setX(String(center.x))
    setY(String(center.y))
  }, [ center.x, center.y, editing ])

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const parsedX = parseCoordinate(x)
    const parsedY = parseCoordinate(y)
    if (parsedX === null || parsedY === null) {
      setError(GO_TO_RANGE_ERROR)
      return
    }
    setError(null)
    setEditing(false)
    onGoTo({ x: parsedX, y: parsedY })
  }

  // Zoomed out (41 rows) next to « − », zoomed in (7 rows) next to « + ».
  const levels = Array.from({ length: MAX_ZOOM_LEVEL - MIN_ZOOM_LEVEL + 1 }, (_, index) => MAX_ZOOM_LEVEL - index)

  return (
    <div className="map-toolbar flex flex-col gap-2 text-meta">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-1" role="group" aria-label="Zoom">
          <button type="button" className={buttonClass} aria-label="Zoom arrière" disabled={zoom >= MAX_ZOOM_LEVEL} onClick={() => onZoom(zoom + 1)}>−</button>
          {levels.map(level => (
            <button
              key={level}
              type="button"
              aria-label={`Niveau de zoom ${level}`}
              aria-pressed={level === zoom}
              className={classNames('h-3 w-3 cursor-pointer rounded-full border border-amber/70', level === zoom ? 'bg-amber' : 'bg-transparent hover:bg-amber/40')}
              onClick={() => onZoom(level)}
            />
          ))}
          <button type="button" className={buttonClass} aria-label="Zoom avant" disabled={zoom <= MIN_ZOOM_LEVEL} onClick={() => onZoom(zoom - 1)}>+</button>
          <span className="ml-2 font-mono tabular-nums text-label" aria-label={`${rows} lignes sur ${columns} colonnes`}>{rows}×{columns}</span>
        </div>

        <form className="flex flex-wrap items-center gap-2" onSubmit={submit} aria-label="Aller à des coordonnées" noValidate>
          <span className="text-label">Aller à</span>
          <label className="flex items-center gap-1">
            X
            <input
              className="field-input field-input--number w-20 py-1"
              type="number"
              min={1}
              max={WORLD_SIZE}
              value={x}
              aria-invalid={Boolean(error)}
              onFocus={() => setEditing(true)}
              onChange={event => setX(event.target.value)}
            />
          </label>
          <label className="flex items-center gap-1">
            Y
            <input
              className="field-input field-input--number w-20 py-1"
              type="number"
              min={1}
              max={WORLD_SIZE}
              value={y}
              aria-invalid={Boolean(error)}
              onFocus={() => setEditing(true)}
              onChange={event => setY(event.target.value)}
            />
          </label>
          <button type="submit" className={buttonClass}>Aller</button>
          {error && <span role="alert" className="text-danger">{error}</span>}
        </form>

        <label className="flex items-center gap-2">
          <span className="text-label">Mes emplacements</span>
          <select
            className="field-input w-56 py-1"
            value=""
            onChange={event => {
              const option = locations.find(location => location.key === event.target.value)
              if (option) onGoTo(option.coordinates)
            }}
          >
            <option value="">Choisir…</option>
            {locations.map(location => <option key={location.key} value={location.key}>{location.label}</option>)}
          </select>
        </label>

        {onRecenter && <button type="button" className={buttonClass} onClick={onRecenter}>Recentrer</button>}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2" role="group" aria-label="Calques">
        <span className="text-label">Calques :</span>
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={layers.movements} onChange={event => onLayersChange({ ...layers, movements: event.target.checked })} />
          Mouvements
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={layers.terrain !== null}
            onChange={event => onLayersChange({ ...layers, terrain: event.target.checked ? 'plastic' : null })}
          />
          Bonus de terrain
        </label>
        {layers.terrain && (
          // `field-input` is full width: the wrapper keeps the select inline with the layer toggles.
          <span className="w-40">
            <select
              aria-label="Ressource du bonus de terrain"
              className="field-input py-1"
              value={layers.terrain}
              onChange={event => onLayersChange({ ...layers, terrain: event.target.value as TerrainMetric })}
            >
              {TERRAIN_METRICS.map(metric => <option key={metric} value={metric}>{TERRAIN_METRIC_LABELS[metric]}</option>)}
            </select>
          </span>
        )}
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={layers.targets} onChange={event => onLayersChange({ ...layers, targets: event.target.checked })} />
          Cibles et menaces
        </label>
        {onShowTargets && <button type="button" className={buttonClass} onClick={onShowTargets}>Liste des cibles</button>}
      </div>
    </div>
  )
}

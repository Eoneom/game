import React, { useEffect, useState } from 'react'
import { Coordinates, WORLD_SIZE } from '@eoneom/api-client'

import { formatCoordinates } from '#helpers/transform'
import { MovementActionLabels } from '#movement/translations'
import { LocationDirectory, formatLocationLabel } from '#movement/location-label'
import { DestinationInfo, describeDestination } from '#movement/api/destination'
import { MovementOrigin } from '#movement/navigation'
import { MovementSendCoordinate } from '#movement/send/coordinate'
import { RecentTarget, formatSentAgo } from '#movement/send/recent-targets'

interface Props {
  origin: MovementOrigin
  originCoordinates: Coordinates | null
  directory: LocationDirectory
  destination: Coordinates | null
  destinationInfo: DestinationInfo | undefined
  destinationLoading: boolean
  recentTargets: RecentTarget[]
  now: number
  onDestinationChange: (destination: Coordinates | null) => void
  /** Absent in the map drawer: the origin is fixed there. */
  onOriginChange?: (origin: MovementOrigin) => void
  onNext: () => void
}

const SAME_CELL_MESSAGE = 'Choisissez une autre case que le point de départ.'

const sameCell = (a: Coordinates | null, b: Coordinates | null): boolean =>
  Boolean(a && b && a.x === b.x && a.y === b.y)

const inWorld = (value: number | ''): value is number => value !== '' && value >= 1 && value <= WORLD_SIZE

const pickClass = 'w-full rounded-sm border border-rust/40 px-2 py-1 text-left text-meta text-amber-dim transition hover:border-rust hover:text-amber'

const PickGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-1">
    <h3 className="m-0 text-caption uppercase tracking-wider text-label">{title}</h3>
    <ul className="m-0 grid list-none grid-cols-1 gap-1 p-0 lg:grid-cols-2">{children}</ul>
  </section>
)

/** Step 1 (slice 045): origin, coordinates, quick picks and what the cell holds. */
export const MovementSendStepDestination: React.FC<Props> = ({
  origin,
  originCoordinates,
  directory,
  destination,
  destinationInfo,
  destinationLoading,
  recentTargets,
  now,
  onDestinationChange,
  onOriginChange,
  onNext,
}) => {
  const [ draft, setDraft ] = useState<{ x: number | ''; y: number | '' }>({
    x: destination?.x ?? '',
    y: destination?.y ?? '',
  })

  // A quick pick or a deep link moves the destination: the inputs follow.
  useEffect(() => {
    if (destination) setDraft({ x: destination.x, y: destination.y })
  }, [ destination?.x, destination?.y ])

  const updateDraft = (next: { x: number | ''; y: number | '' }) => {
    setDraft(next)
    onDestinationChange(inWorld(next.x) && inWorld(next.y) ? { x: next.x, y: next.y } : null)
  }

  const outOfWorld = (draft.x !== '' && !inWorld(draft.x)) || (draft.y !== '' && !inWorld(draft.y))
  const isOrigin = sameCell(destination, originCoordinates)
  const canContinue = Boolean(destination) && !isOrigin

  const notOrigin = (coordinates: Coordinates) => !sameCell(coordinates, originCoordinates)
  const pick = (coordinates: Coordinates) => onDestinationChange(coordinates)
  const cities = directory.cities.filter(city => notOrigin(city.coordinates))
  const outposts = directory.outposts.filter(outpost => notOrigin(outpost.coordinates))
  const allied = directory.allied_cities.filter(city => notOrigin(city.coordinates))
  const recents = recentTargets.filter(target => notOrigin(target.coordinates))
  const originKey = `${origin.kind}:${origin.id}`

  return (
    <div className="space-y-4">
      <label className="flex max-w-sm flex-col gap-1">
        <span className="field-label">Depuis</span>
        {onOriginChange ? (
          <select
            className="field-input"
            value={originKey}
            onChange={event => {
              const [ kind, id ] = event.target.value.split(':')
              onOriginChange({ kind: kind as MovementOrigin['kind'], id })
            }}
          >
            <optgroup label="Villes">
              {directory.cities.map(city => (
                <option key={city.id} value={`city:${city.id}`}>{formatLocationLabel(city.coordinates, directory)}</option>
              ))}
            </optgroup>
            {directory.outposts.length > 0 && (
              <optgroup label="Avant-postes">
                {directory.outposts.map(outpost => (
                  <option key={outpost.id} value={`outpost:${outpost.id}`}>
                    {formatLocationLabel(outpost.coordinates, directory)}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        ) : (
          <span className="text-body text-amber">
            {originCoordinates ? formatLocationLabel(originCoordinates, directory) : '…'}
          </span>
        )}
      </label>

      <div className="flex items-end gap-3">
        <MovementSendCoordinate
          label="X"
          value={draft.x}
          onChange={x => updateDraft({ ...draft, x })}
          onEnter={() => canContinue && onNext()}
        />
        <MovementSendCoordinate
          label="Y"
          value={draft.y}
          onChange={y => updateDraft({ ...draft, y })}
          onEnter={() => canContinue && onNext()}
        />
      </div>

      <div className="min-h-[1.5rem] text-body" aria-live="polite">
        {outOfWorld ? (
          <p className="m-0 text-danger">Coordonnées hors de la carte (1 à {WORLD_SIZE}).</p>
        ) : isOrigin ? (
          <p className="m-0 text-danger">{SAME_CELL_MESSAGE}</p>
        ) : destination ? (
          <p className="m-0 text-amber-dim">
            Case <span className="font-mono tabular-nums text-amber">{formatCoordinates(destination)}</span> :{' '}
            <span className="text-amber">
              {destinationInfo ? describeDestination(destinationInfo) : destinationLoading ? 'Chargement…' : 'Case inconnue'}
            </span>
          </p>
        ) : (
          <p className="m-0 text-label">Saisissez des coordonnées ou choisissez une case ci-dessous.</p>
        )}
      </div>

      <div className="space-y-3">
        {cities.length > 0 && (
          <PickGroup title="Mes villes">
            {cities.map(city => (
              <li key={city.id}>
                <button type="button" className={pickClass} onClick={() => pick(city.coordinates)}>
                  {formatLocationLabel(city.coordinates, directory)}
                </button>
              </li>
            ))}
          </PickGroup>
        )}
        {outposts.length > 0 && (
          <PickGroup title="Mes avant-postes">
            {outposts.map(outpost => (
              <li key={outpost.id}>
                <button type="button" className={pickClass} onClick={() => pick(outpost.coordinates)}>
                  {formatLocationLabel(outpost.coordinates, directory)}
                </button>
              </li>
            ))}
          </PickGroup>
        )}
        {allied.length > 0 && (
          <PickGroup title="Villes alliées">
            {allied.map(city => (
              <li key={`${city.coordinates.x}.${city.coordinates.y}`}>
                <button type="button" className={pickClass} onClick={() => pick(city.coordinates)}>
                  {formatLocationLabel(city.coordinates, directory)}
                </button>
              </li>
            ))}
          </PickGroup>
        )}
        {recents.length > 0 && (
          <PickGroup title="Cibles récentes">
            {recents.map(target => (
              <li key={`${target.coordinates.x}.${target.coordinates.y}`}>
                <button type="button" className={pickClass} onClick={() => pick(target.coordinates)}>
                  {formatCoordinates(target.coordinates)} — {MovementActionLabels[target.action]}, {formatSentAgo(target.sent_at, now)}
                </button>
              </li>
            ))}
          </PickGroup>
        )}
      </div>
    </div>
  )
}
